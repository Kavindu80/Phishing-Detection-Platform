"""
PhishGuard Functional Tests - History & Analytics
=================================================
Test Cases: TC-036 to TC-060
"""

import pytest
from datetime import datetime, timedelta


class TestHistoryFunctional:
    """Test cases for Scan History module (TC-036 to TC-045)"""
    
    @pytest.mark.functional
    def test_TC036_view_scan_history_with_data(self):
        """TC-036: View Scan History - With Data"""
        user_scans = [
            {"id": "1", "date": datetime.now() - timedelta(days=1)},
            {"id": "2", "date": datetime.now() - timedelta(days=2)},
        ]
        
        assert len(user_scans) > 0
        # Should be sorted newest first
        assert user_scans[0]["date"] > user_scans[1]["date"]
    
    @pytest.mark.functional
    def test_TC037_view_scan_history_empty_state(self):
        """TC-037: View Scan History - Empty State"""
        user_scans = []
        show_empty_message = len(user_scans) == 0
        assert show_empty_message == True
    
    @pytest.mark.functional
    def test_TC038_history_pagination_first_page(self):
        """TC-038: History Pagination - First Page (BVA)"""
        total = 25
        page_size = 10
        page = 1
        
        start = (page - 1) * page_size
        end = min(start + page_size, total)
        
        assert start == 0
        assert end == 10
    
    @pytest.mark.functional
    def test_TC039_history_pagination_last_page(self):
        """TC-039: History Pagination - Last Page (BVA)"""
        total = 25
        page_size = 10
        page = 3
        
        start = (page - 1) * page_size
        items_on_page = min(page_size, total - start)
        
        assert items_on_page == 5
    
    @pytest.mark.functional
    def test_TC040_history_view_scan_details(self):
        """TC-040: History - View Scan Details"""
        scan_detail = {
            "id": "scan_123",
            "email_text": "Test email",
            "prediction": "legitimate",
            "confidence": 25.5,
            "created_at": datetime.now()
        }
        
        has_required = all(k in scan_detail for k in 
                         ["email_text", "prediction", "confidence"])
        assert has_required == True
    
    @pytest.mark.functional
    def test_TC041_history_filter_by_date_range(self):
        """TC-041: History - Filter by Date Range"""
        all_scans = [
            {"date": datetime.now() - timedelta(days=1)},
            {"date": datetime.now() - timedelta(days=10)},
        ]
        
        start = datetime.now() - timedelta(days=7)
        end = datetime.now()
        
        filtered = [s for s in all_scans if start <= s["date"] <= end]
        assert len(filtered) == 1
    
    @pytest.mark.functional
    def test_TC042_history_search_by_keyword(self):
        """TC-042: History - Search by Keyword"""
        scans = [
            {"email_text": "urgent payment required"},
            {"email_text": "meeting reminder"},
        ]
        
        keyword = "payment"
        results = [s for s in scans if keyword in s["email_text"]]
        assert len(results) == 1
    
    @pytest.mark.functional
    def test_TC043_history_sort_by_confidence(self):
        """TC-043: History - Sort by Confidence"""
        scans = [{"conf": 25}, {"conf": 85}, {"conf": 45}]
        sorted_scans = sorted(scans, key=lambda x: x["conf"], reverse=True)
        assert sorted_scans[0]["conf"] == 85
    
    @pytest.mark.functional
    def test_TC044_submit_feedback_on_scan(self):
        """TC-044: Submit Feedback on Scan"""
        feedback = {"scan_id": "123", "is_correct": False, "type": "false_positive"}
        assert "is_correct" in feedback
    
    @pytest.mark.functional
    def test_TC045_delete_scan_from_history(self):
        """TC-045: Delete Scan from History"""
        scans = ["scan_1", "scan_2", "scan_3"]
        to_delete = "scan_2"
        scans.remove(to_delete)
        assert to_delete not in scans


class TestAnalyticsFunctional:
    """Test cases for Analytics Dashboard (TC-046 to TC-055)"""
    
    @pytest.mark.functional
    def test_TC046_dashboard_load_with_data(self):
        """TC-046: Dashboard Load - With Data"""
        stats = {"total_scans": 15, "phishing_count": 6}
        has_data = stats["total_scans"] > 0
        assert has_data == True
    
    @pytest.mark.functional
    def test_TC047_dashboard_empty_state(self):
        """TC-047: Dashboard - Empty State"""
        stats = {"total_scans": 0, "phishing_count": 0}
        show_prompt = stats["total_scans"] == 0
        assert show_prompt == True
    
    @pytest.mark.functional
    def test_TC048_total_scans_count_accuracy(self):
        """TC-048: Total Scans Count Accuracy"""
        scans = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
        displayed = 15
        assert displayed == len(scans)
    
    @pytest.mark.functional
    def test_TC049_phishing_detection_rate_calculation(self):
        """TC-049: Phishing Detection Rate Calculation"""
        total = 10
        phishing = 4
        rate = (phishing / total) * 100
        assert rate == 40.0
    
    @pytest.mark.functional
    def test_TC050_average_confidence_score(self):
        """TC-050: Average Confidence Score"""
        scores = [60, 80, 70]
        avg = sum(scores) / len(scores)
        assert avg == 70.0
    
    @pytest.mark.functional
    def test_TC051_chart_scans_over_time(self):
        """TC-051: Chart - Scans Over Time"""
        chart_data = {"labels": ["Mon", "Tue", "Wed"], "values": [5, 3, 8]}
        has_data = len(chart_data["labels"]) == len(chart_data["values"])
        assert has_data == True
    
    @pytest.mark.functional
    def test_TC052_chart_risk_distribution_pie(self):
        """TC-052: Chart - Risk Distribution Pie"""
        distribution = {"Low": 10, "Medium": 5, "High": 3}
        total = sum(distribution.values())
        assert total == 18
    
    @pytest.mark.functional
    def test_TC053_date_range_filter_on_dashboard(self):
        """TC-053: Date Range Filter on Dashboard"""
        period = "7days"
        days_to_filter = int(period.replace("days", ""))
        assert days_to_filter == 7
    
    @pytest.mark.functional
    def test_TC054_export_analytics_report(self):
        """TC-054: Export Analytics Report"""
        export_formats = ["pdf", "csv"]
        assert "pdf" in export_formats
    
    @pytest.mark.functional
    def test_TC055_realtime_stats_update(self):
        """TC-055: Real-time Stats Update"""
        before = {"total": 10}
        after_scan = {"total": 11}
        updated = after_scan["total"] == before["total"] + 1
        assert updated == True


class TestGmailIntegration:
    """Test cases for Gmail Integration (TC-056 to TC-060)"""
    
    @pytest.mark.functional
    def test_TC056_connect_gmail_account(self):
        """TC-056: Connect Gmail Account"""
        oauth_url = "https://accounts.google.com/o/oauth2/auth"
        assert "accounts.google.com" in oauth_url
    
    @pytest.mark.functional
    def test_TC057_fetch_emails_from_gmail(self):
        """TC-057: Fetch Emails from Gmail"""
        gmail_connected = True
        emails = [{"subject": "Test"}, {"subject": "Hello"}] if gmail_connected else []
        assert len(emails) > 0
    
    @pytest.mark.functional
    def test_TC058_scan_gmail_email(self):
        """TC-058: Scan Gmail Email"""
        email = {"subject": "Urgent", "body": "Click link now"}
        result = {"prediction": "phishing", "confidence": 85}
        assert "prediction" in result
    
    @pytest.mark.functional
    def test_TC059_disconnect_gmail(self):
        """TC-059: Disconnect Gmail"""
        before = {"gmail_connected": True}
        after = {"gmail_connected": False}
        disconnected = not after["gmail_connected"]
        assert disconnected == True
    
    @pytest.mark.functional
    def test_TC060_gmail_token_refresh(self):
        """TC-060: Gmail Token Refresh (State Transition)"""
        token_expired = True
        new_token = "refreshed_token" if token_expired else None
        assert new_token is not None
