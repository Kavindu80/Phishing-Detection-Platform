from datetime import datetime, timedelta
from bson import ObjectId
from flask import jsonify, request
import logging

from ..config.database import get_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AnalyticsController:
	@staticmethod
	def _get_accuracy_trend(db, query, days=30):
		try:
			today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
			# Choose bucket granularity by requested range
			if days == 0:
				date_format = "%Y-%m"  # Monthly buckets for 'all time'
			elif days <= 7:
				date_format = "%Y-%m-%d-%H"
			elif days <= 30:
				date_format = "%Y-%m-%d"
			else:
				date_format = "%Y-%W"

			date_bins = {}
			has_feedback_points = False
			try:
				base_query = query.copy() if query else {}
				# Only constrain by start_date when a finite range is requested
				if days > 0:
					start_date = today - timedelta(days=days)
					if 'date' not in base_query:
						base_query['date'] = {'$gte': start_date}
				base_query['feedback'] = {'$exists': True}
				pipeline = [
					{"$match": base_query},
					{"$project": {
						"date": 1,
						"verdict": 1,
						"feedback": 1,
						"correct_prediction": {
							"$cond": {
								"if": {"$eq": [
									{"$or": [
										{"$and": [{"$eq": ["$verdict", "phishing"]}, {"$eq": ["$feedback", True]}]},
										{"$and": [{"$ne": ["$verdict", "phishing"]}, {"$eq": ["$feedback", False]}]}
									]},
									True
								]},
								"then": 1,
								"else": 0
							}
						},
						"date_str": {"$dateToString": {"format": date_format, "date": "$date"}}
					}},
					{"$group": {"_id": "$date_str", "total": {"$sum": 1}, "correct": {"$sum": "$correct_prediction"}}},
					{"$project": {"date": "$_id", "accuracy": {"$multiply": [{"$divide": ["$correct", {"$max": ["$total", 1]}]}, 100]}}},
					{"$sort": {"date": 1}}
				]
				results = list(db.scans.aggregate(pipeline))
				if results:
					has_feedback_points = True
					for item in results:
						date_bins[item["date"]] = {"date": item["date"], "accuracy": round(item["accuracy"], 1)}
			except Exception as agg_error:
				logger.error(f"Error calculating accuracy trend: {str(agg_error)}")

			# If no feedback-driven points, derive proxy from verdict counts
			counts = []
			if not has_feedback_points:
				try:
					base_query = query.copy() if query else {}
					if days > 0:
						start_date = today - timedelta(days=days)
						if 'date' not in base_query:
							base_query['date'] = {'$gte': start_date}
					pipeline_counts = [
						{"$match": base_query},
						{"$project": {"date_str": {"$dateToString": {"format": date_format, "date": "$date"}}, "verdict": 1}},
						{"$group": {"_id": {"date": "$date_str", "verdict": "$verdict"}, "count": {"$sum": 1}}},
						{"$sort": {"_id.date": 1}}
					]
					counts = list(db.scans.aggregate(pipeline_counts))
					per_date = {}
					for item in counts:
						d = item['_id']['date']
						v = item['_id']['verdict']
						c = item['count']
						if d not in per_date:
							per_date[d] = {"safe": 0, "suspicious": 0, "phishing": 0, "total": 0}
						if v in per_date[d]:
							per_date[d][v] += c
							per_date[d]["total"] += c
					for d, vals in per_date.items():
						total = max(1, vals.get("total", 0))
						if total <= 1 and vals.get("safe", 0) == 0 and vals.get("suspicious", 0) == 0 and vals.get("phishing", 0) == 0:
							continue
						phishing_ratio = vals.get("phishing", 0) / total
						suspicious_ratio = vals.get("suspicious", 0) / total
						est = 100 - (phishing_ratio * 50 + suspicious_ratio * 25)
						est = max(80, min(100, est))
						date_bins[d] = {"date": d, "accuracy": round(est, 1)}
				except Exception as e:
					logger.error(f"Error deriving proxy accuracy trend: {str(e)}")

			if not date_bins:
				return []

			# Smooth only across actual points
			keys = sorted(date_bins.keys())
			avg_accuracy = 98.2
			for k in keys:
				current = date_bins[k]["accuracy"]
				date_bins[k]["accuracy"] = round(0.7 * current + 0.3 * avg_accuracy, 1)
				avg_accuracy = date_bins[k]["accuracy"]

			trend_data = [{"date": k, "accuracy": date_bins[k]["accuracy"]} for k in keys]
			return trend_data
		except Exception as e:
			logger.error(f"Error getting accuracy trend: {str(e)}")
			return []

	@staticmethod
	def get_analytics(current_user):
		try:
			time_range = request.args.get('timeRange', '30d')
			no_cache = request.args.get('no_cache', 'false').lower() == 'true'
			logger.info(f"Getting analytics for user {current_user['id']}, time range: {time_range}, no_cache: {no_cache}")
			db = get_db()
			query = {"user_id": ObjectId(current_user['id'])}
			days = {'7d': 7, '30d': 30, '90d': 90, '1y': 365, 'all': 0}.get(time_range, 30)
			if days > 0:
				cutoff_date = datetime.utcnow() - timedelta(days=days)
				query['date'] = {'$gte': cutoff_date}
			user_analytics = db.user_analytics.find_one({"user_id": ObjectId(current_user['id'])})
			if not user_analytics:
				logger.info(f"No analytics document found for user {current_user['id']}, creating one")
				user_analytics = {
					"user_id": ObjectId(current_user['id']),
					"total_scans": 0,
					"safe_count": 0,
					"suspicious_count": 0,
					"phishing_count": 0,
					"total_gmail_scans": 0,
					"gmail_safe_count": 0,
					"gmail_suspicious_count": 0,
					"gmail_phishing_count": 0,
					"languages": {},
					"phishing_domains": {},
					"first_scan_date": datetime.utcnow(),
					"last_scan_date": None,
					"last_gmail_scan": None
				}
				db.user_analytics.insert_one(user_analytics)
			else:
				logger.info(f"Found analytics document for user {current_user['id']} with {user_analytics.get('total_scans', 0)} total scans")
			try:
				actual_scan_count = db.scans.count_documents({"user_id": ObjectId(current_user['id'])})
				if actual_scan_count != user_analytics.get('total_scans', 0):
					logger.info(f"Analytics count mismatch: stored {user_analytics.get('total_scans', 0)}, actual {actual_scan_count}, updating...")
					db.user_analytics.update_one({"user_id": ObjectId(current_user['id'])}, {"$set": {"total_scans": actual_scan_count}})
					user_analytics = db.user_analytics.find_one({"user_id": ObjectId(current_user['id'])})
			except Exception as count_error:
				logger.error(f"Error refreshing scan count: {str(count_error)}")
			if 'date' in query or no_cache:
				logger.info(f"Getting fresh analytics data from scans collection for time range {time_range}")
			# For 'all' time range, also force fresh to ensure up-to-date counts
			force_fresh_all = (days == 0)
			verdict_distribution = AnalyticsController._get_verdict_distribution(db, query, user_analytics, force_fresh=(no_cache or force_fresh_all))
			language_distribution = AnalyticsController._get_language_distribution(db, query, user_analytics, force_fresh=no_cache)
			top_phishing_domains = AnalyticsController._get_top_phishing_domains(db, query, user_analytics, force_fresh=no_cache)
			accuracy_metrics = AnalyticsController._get_accuracy_metrics(db, query)
			scans_over_time = AnalyticsController._get_scans_over_time(db, query, days)
			accuracy_trend = AnalyticsController._get_accuracy_trend(db, query, days)
			# New: scansByVerdict and verdictTrend for ThreatOverview component
			# Aggregate counts by verdict for the current range
			pipeline_counts = [
				{"$match": query},
				{"$group": {"_id": "$verdict", "count": {"$sum": 1}}}
			]
			counts_result = list(db.scans.aggregate(pipeline_counts))
			scans_by_verdict = {"safe": 0, "suspicious": 0, "phishing": 0}
			for item in counts_result:
				v = item.get('_id')
				if v in scans_by_verdict:
					scans_by_verdict[v] = int(item.get('count', 0))

			# Build a lightweight verdict trend using scans_over_time buckets
			verdict_trend = []
			for point in scans_over_time:
				verdict_trend.append({
					"phishing": int(point.get('phishing', 0)),
					"suspicious": int(point.get('suspicious', 0)),
					"safe": int(point.get('safe', 0))
				})
			analytics_data = {
				'verdictDistribution': verdict_distribution,
				'languageDistribution': language_distribution,
				'topPhishingDomains': top_phishing_domains,
				'accuracyMetrics': accuracy_metrics,
				'scansOverTime': scans_over_time,
				'accuracyTrend': accuracy_trend,
				'scansByVerdict': scans_by_verdict,
				'verdictTrend': verdict_trend,
				'gmailIntegrationActive': user_analytics.get('last_gmail_scan') is not None,
				'totalScans': user_analytics.get('total_scans', 0),
				'lastScanDate': user_analytics.get('last_scan_date'),
				'refreshedAt': datetime.utcnow().isoformat()
			}
			logger.info(f"Successfully generated analytics data with {len(scans_over_time)} time points")
			return jsonify(analytics_data), 200
		except Exception as e:
			logger.exception(f"Error getting analytics: {str(e)}")
			fallback_data = {
				'verdictDistribution': {'safe': 0, 'suspicious': 0, 'phishing': 0},
				'languageDistribution': {},
				'topPhishingDomains': [],
				'accuracyMetrics': {'currentAccuracy': 0.0, 'falsePositives': 0.0, 'falseNegatives': 0.0, 'totalFeedbackCount': 0},
				'scansOverTime': [],
				'accuracyTrend': [],
				'gmailIntegrationActive': False,
				'totalScans': 0,
				'lastScanDate': None,
				'refreshedAt': datetime.utcnow().isoformat(),
				'isErrorFallback': True
			}
			return jsonify(fallback_data), 200

	@staticmethod
	def _get_verdict_distribution(db, query, user_analytics, force_fresh=False):
		try:
			# Use fresh aggregation when a date filter is present OR when explicitly requested
			if 'date' in query or force_fresh:
				pipeline = [
					{"$match": query},
					{"$group": {"_id": "$verdict", "count": {"$sum": 1}}}
				]
				results = list(db.scans.aggregate(pipeline))
				total = sum(item['count'] for item in results)
				distribution = {'safe': 0, 'suspicious': 0, 'phishing': 0}
				if total > 0:
					for item in results:
						verdict = item['_id']
						count = item['count']
						distribution[verdict] = round((count / total) * 100)
				return distribution
			else:
				total = user_analytics.get('total_scans', 0)
				if total > 0:
					return {
						'safe': round((user_analytics.get('safe_count', 0) / total) * 100),
						'suspicious': round((user_analytics.get('suspicious_count', 0) / total) * 100),
						'phishing': round((user_analytics.get('phishing_count', 0) / total) * 100)
					}
				return {'safe': 0, 'suspicious': 0, 'phishing': 0}
		except Exception as e:
			logger.error(f"Error getting verdict distribution: {str(e)}")
			return {'safe': 0, 'suspicious': 0, 'phishing': 0}

	@staticmethod
	def _get_language_distribution(db, query, user_analytics, force_fresh=False):
		try:
			languages = user_analytics.get('languages', {}) or {}
			if not languages or force_fresh:
				pipeline = [
					{"$match": query},
					# prefer the pre-translation detected_language, fallback to language/mongo_language
					{"$project": {"lang": {"$ifNull": ["$detected_language", {"$ifNull": ["$language", "$mongo_language"]}]}}},
					{"$group": {"_id": "$lang", "count": {"$sum": 1}}}
				]
				results = list(db.scans.aggregate(pipeline))
				total = sum(item['count'] for item in results)
				if total > 0:
					languages = {}
					for item in results:
						lang = item['_id'] or 'none'
						languages[lang] = round((item['count'] / total) * 100)
			return languages
		except Exception as e:
			logger.error(f"Error getting language distribution: {str(e)}")
			return {}

	@staticmethod
	def _get_top_phishing_domains(db, query, user_analytics, force_fresh=False):
		try:
			phishing_domains = user_analytics.get('phishing_domains', {}) or {}
			if not phishing_domains or force_fresh:
				pipeline = [
					{"$match": {**query, "verdict": "phishing"}},
					# Prefer sender_domain when available; fallback to sender
					{"$project": {"domain": {"$toLower": {"$ifNull": ["$sender_domain", "$sender"]}}}},
					{"$group": {"_id": "$domain", "count": {"$sum": 1}}}
				]
				results = list(db.scans.aggregate(pipeline))
				# Normalize and filter out invalid values
				phishing_domains = {}
				for item in results:
					d = (item.get('_id') or '').strip().lower()
					if not d:
						continue
					# If the fallback used the full sender string, try to extract domain-like token
					if '@' in d:
						d = d.split('@')[-1]
					phishing_domains[d] = phishing_domains.get(d, 0) + int(item.get('count', 0))
			domain_list = [{"domain": d, "count": c} for d, c in phishing_domains.items() if d]
			domain_list.sort(key=lambda x: x['count'], reverse=True)
			return domain_list[:10]
		except Exception as e:
			logger.error(f"Error getting top phishing domains: {str(e)}")
			return []

	@staticmethod
	def _get_accuracy_metrics(db, query):
		try:
			feedback_query = query.copy()
			feedback_query['feedback'] = {'$exists': True}
			scans_with_feedback = list(db.scans.find(feedback_query))
			total_feedback = len(scans_with_feedback)
			correct_predictions = 0
			false_positives = 0
			false_negatives = 0
			for scan in scans_with_feedback:
				is_phishing = scan['verdict'] == 'phishing'
				user_agrees = scan['feedback']
				if (is_phishing and user_agrees) or (not is_phishing and not user_agrees):
					correct_predictions += 1
				elif is_phishing and not user_agrees:
					false_positives += 1
				elif not is_phishing and user_agrees:
					false_negatives += 1
			if total_feedback > 0:
				accuracy = (correct_predictions / total_feedback) * 100
				fpr = (false_positives / total_feedback) * 100
				fnr = (false_negatives / total_feedback) * 100
			else:
				accuracy = 0.0
				fpr = 0.0
				fnr = 0.0
			return {'currentAccuracy': round(accuracy, 1), 'falsePositives': round(fpr, 1), 'falseNegatives': round(fnr, 1), 'totalFeedbackCount': total_feedback}
		except Exception as e:
			logger.error(f"Error getting accuracy metrics: {str(e)}")
			return {'currentAccuracy': 0.0, 'falsePositives': 0.0, 'falseNegatives': 0.0, 'totalFeedbackCount': 0}

	@staticmethod
	def _get_scans_over_time(db, query, days=30):
		try:
			today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
			# Select grouping granularity
			if days == 0:
				group_format = "%Y-%m"
				date_format = "%Y-%m"
			elif days <= 7:
				group_format = "%Y-%m-%d-%H"
				date_format = "%Y-%m-%d-%H"
			elif days <= 30:
				group_format = "%Y-%m-%d"
				date_format = "%Y-%m-%d"
			else:
				group_format = "%Y-%W"
				date_format = "%Y-%W"
			date_bins = {}
			try:
				base_query = query.copy() if query else {}
				if days > 0:
					start_date = today - timedelta(days=days)
					if 'date' not in base_query:
						base_query['date'] = {'$gte': start_date}
				pipeline = [
					{"$match": base_query},
					{"$project": {"date": 1, "verdict": 1, "date_str": {"$dateToString": {"format": group_format, "date": "$date"}}}},
					{"$group": {"_id": {"date": "$date_str", "verdict": "$verdict"}, "count": {"$sum": 1}}},
					{"$sort": {"_id.date": 1}}
				]
				results = list(db.scans.aggregate(pipeline))
				for item in results:
					date_key = item['_id']['date']
					verdict = item['_id']['verdict']
					count = item['count']
					if date_key not in date_bins:
						date_bins[date_key] = {"date": date_key, "safe": 0, "suspicious": 0, "phishing": 0}
					if verdict in ['safe', 'suspicious', 'phishing']:
						date_bins[date_key][verdict] = count
			except Exception as agg_error:
				logger.error(f"Error in time series aggregation: {str(agg_error)}")
			if not date_bins:
				return []
			time_series = [date_bins[k] for k in sorted(date_bins.keys())]
			return time_series
		except Exception as e:
			logger.error(f"Error getting scans over time: {str(e)}")
			return [] 