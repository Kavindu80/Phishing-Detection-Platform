#!/usr/bin/env python3
"""
PhishGuard Performance Testing Script
Tests application performance and identifies bottlenecks
"""

import requests
import time
import json
import threading
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
import os
from datetime import datetime

# Try to import psutil, but continue without it if not available
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    print("WARNING: psutil not available. System monitoring will be limited.")
    print("Install with: pip install psutil")
    PSUTIL_AVAILABLE = False

class PerformanceTester:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.results = {}
        self.auth_token = None
        
    def get_system_info(self):
        """Get system information"""
        if PSUTIL_AVAILABLE:
            return {
                "cpu_count": psutil.cpu_count(),
                "memory_total": psutil.virtual_memory().total,
                "memory_available": psutil.virtual_memory().available,
                "disk_usage": psutil.disk_usage('/').percent
            }
        else:
            return {
                "cpu_count": "Unknown (psutil not available)",
                "memory_total": "Unknown (psutil not available)",
                "memory_available": "Unknown (psutil not available)",
                "disk_usage": "Unknown (psutil not available)"
            }
    
    def measure_response_time(self, method, endpoint, data=None, headers=None, iterations=10):
        """Measure response time for an endpoint"""
        times = []
        status_codes = []
        errors = []
        
        for i in range(iterations):
            try:
                start_time = time.time()
                
                if method.upper() == "GET":
                    response = self.session.get(f"{self.base_url}{endpoint}", 
                                             headers=headers, timeout=30)
                elif method.upper() == "POST":
                    response = self.session.post(f"{self.base_url}{endpoint}", 
                                              json=data, headers=headers, timeout=30)
                else:
                    continue
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000  # Convert to milliseconds
                
                times.append(response_time)
                status_codes.append(response.status_code)
                
            except Exception as e:
                errors.append(str(e))
                times.append(None)
                status_codes.append(None)
        
        # Calculate statistics
        valid_times = [t for t in times if t is not None]
        
        if valid_times:
            return {
                "endpoint": endpoint,
                "method": method,
                "iterations": iterations,
                "successful_requests": len(valid_times),
                "failed_requests": len(errors),
                "errors": errors,
                "response_times": {
                    "min": min(valid_times),
                    "max": max(valid_times),
                    "mean": statistics.mean(valid_times),
                    "median": statistics.median(valid_times),
                    "std_dev": statistics.stdev(valid_times) if len(valid_times) > 1 else 0
                },
                "status_codes": status_codes,
                "success_rate": len(valid_times) / iterations * 100
            }
        else:
            return {
                "endpoint": endpoint,
                "method": method,
                "iterations": iterations,
                "successful_requests": 0,
                "failed_requests": len(errors),
                "errors": errors,
                "response_times": None,
                "status_codes": status_codes,
                "success_rate": 0
            }

    def test_health_endpoint(self):
        """Test health endpoint performance"""
        print("Testing health endpoint...")
        return self.measure_response_time("GET", "/api/health", iterations=20)

    def test_authentication_performance(self):
        """Test authentication endpoints performance"""
        print("Testing authentication endpoints...")
        
        # Test registration
        register_data = {
            "email": f"perf_test_{int(time.time())}@test.com",
            "password": "TestPassword123!",
            "name": "Performance Test User"
        }
        
        register_result = self.measure_response_time("POST", "/api/auth/register", 
                                                   data=register_data, iterations=10)
        
        # Test login
        login_data = {
            "email": register_data["email"],
            "password": register_data["password"]
        }
        
        login_result = self.measure_response_time("POST", "/api/auth/login", 
                                                data=login_data, iterations=10)
        
        # Extract token for authenticated tests
        try:
            login_response = self.session.post(f"{self.base_url}/api/auth/login", 
                                             json=login_data, timeout=30)
            if login_response.status_code == 200:
                self.auth_token = login_response.json().get("token")
        except:
            pass
        
        return {
            "registration": register_result,
            "login": login_result
        }

    def test_scanning_performance(self):
        """Test scanning endpoints performance"""
        print("Testing scanning endpoints...")
        
        # Test data with different sizes
        test_emails = [
            # Small email
            {
                "emailText": "Hello, this is a test email.",
                "language": "auto"
            },
            # Medium email
            {
                "emailText": "Dear User, We have detected suspicious activity on your account. Please click the link below to verify your identity: https://example.com/verify. Thank you, Security Team",
                "language": "auto"
            },
            # Large email (phishing attempt)
            {
                "emailText": """
                Dear Valued Customer,

                We have detected unusual activity on your account that requires immediate attention. 
                Your account has been temporarily suspended for security reasons.

                To restore access to your account, please click on the following link and complete the verification process:
                https://secure-banking-verify.com/account/restore

                This verification is mandatory and must be completed within 24 hours to prevent permanent account closure.

                If you do not complete this verification, your account will be permanently suspended and all funds will be frozen.

                Please note:
                - This is an automated security measure
                - The link is secure and encrypted
                - Your personal information is protected
                - This verification is required by federal regulations

                If you have any questions, please contact our support team immediately.

                Thank you for your cooperation.

                Best regards,
                Security Department
                """,
                "language": "auto"
            }
        ]
        
        results = {}
        
        for i, email_data in enumerate(test_emails):
            size_label = ["small", "medium", "large"][i]
            print(f"  Testing {size_label} email...")
            results[size_label] = self.measure_response_time("POST", "/api/scan", 
                                                           data=email_data, iterations=5)
        
        return results

    def test_analytics_performance(self):
        """Test analytics endpoints performance"""
        print("Testing analytics endpoints...")
        
        headers = {}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        
        results = {}
        
        # Test basic analytics
        results["basic_analytics"] = self.measure_response_time("GET", "/api/analytics", 
                                                              headers=headers, iterations=5)
        
        # Test analytics export
        results["analytics_export"] = self.measure_response_time("GET", "/api/analytics/export", 
                                                               headers=headers, iterations=3)
        
        return results

    def test_concurrent_requests(self):
        """Test application performance under concurrent load"""
        print("Testing concurrent requests...")
        
        def make_request(request_id):
            """Make a single request"""
            try:
                start_time = time.time()
                response = self.session.post(f"{self.base_url}/api/scan", 
                                           json={"emailText": f"Test email {request_id}", "language": "auto"}, 
                                           timeout=30)
                end_time = time.time()
                return {
                    "request_id": request_id,
                    "response_time": (end_time - start_time) * 1000,
                    "status_code": response.status_code,
                    "success": response.status_code == 200
                }
            except Exception as e:
                return {
                    "request_id": request_id,
                    "response_time": None,
                    "status_code": None,
                    "success": False,
                    "error": str(e)
                }
        
        # Test different concurrency levels
        concurrency_levels = [5, 10, 20, 50]
        results = {}
        
        for concurrency in concurrency_levels:
            print(f"  Testing with {concurrency} concurrent requests...")
            
            start_time = time.time()
            
            with ThreadPoolExecutor(max_workers=concurrency) as executor:
                futures = [executor.submit(make_request, i) for i in range(concurrency)]
                responses = [future.result() for future in as_completed(futures)]
            
            end_time = time.time()
            total_time = (end_time - start_time) * 1000
            
            successful_requests = [r for r in responses if r["success"]]
            failed_requests = [r for r in responses if not r["success"]]
            
            response_times = [r["response_time"] for r in successful_requests if r["response_time"] is not None]
            
            results[f"{concurrency}_concurrent"] = {
                "concurrency_level": concurrency,
                "total_requests": concurrency,
                "successful_requests": len(successful_requests),
                "failed_requests": len(failed_requests),
                "success_rate": len(successful_requests) / concurrency * 100,
                "total_time_ms": total_time,
                "requests_per_second": concurrency / (total_time / 1000),
                "response_times": {
                    "min": min(response_times) if response_times else 0,
                    "max": max(response_times) if response_times else 0,
                    "mean": statistics.mean(response_times) if response_times else 0,
                    "median": statistics.median(response_times) if response_times else 0
                },
                "responses": responses
            }
        
        return results

    def test_memory_usage(self):
        """Test memory usage during operations"""
        print("Testing memory usage...")
        
        if not PSUTIL_AVAILABLE:
            print("WARNING: psutil not available, skipping memory usage test")
            return {
                "initial_memory_mb": "Unknown (psutil not available)",
                "final_memory_mb": "Unknown (psutil not available)",
                "memory_increase_mb": "Unknown (psutil not available)",
                "memory_increase_percent": "Unknown (psutil not available)"
            }
        
        # Get initial memory usage
        initial_memory = psutil.virtual_memory().used
        
        # Perform intensive operations
        for i in range(10):
            try:
                self.session.post(f"{self.base_url}/api/scan", 
                                json={"emailText": f"Memory test email {i}" * 100, "language": "auto"}, 
                                timeout=30)
            except:
                pass
        
        # Get final memory usage
        final_memory = psutil.virtual_memory().used
        memory_increase = final_memory - initial_memory
        
        return {
            "initial_memory_mb": initial_memory / (1024 * 1024),
            "final_memory_mb": final_memory / (1024 * 1024),
            "memory_increase_mb": memory_increase / (1024 * 1024),
            "memory_increase_percent": (memory_increase / initial_memory) * 100 if initial_memory > 0 else 0
        }

    def run_all_tests(self):
        """Run all performance tests"""
        print("Starting PhishGuard Performance Testing...")
        print("=" * 50)
        
        # Get system info
        system_info = self.get_system_info()
        print(f"System Info: {system_info}")
        
        # Run all tests
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "system_info": system_info,
            "health_endpoint": self.test_health_endpoint(),
            "authentication": self.test_authentication_performance(),
            "scanning": self.test_scanning_performance(),
            "analytics": self.test_analytics_performance(),
            "concurrent_requests": self.test_concurrent_requests(),
            "memory_usage": self.test_memory_usage()
        }
        
        # Generate report
        self.generate_report()

    def generate_report(self):
        """Generate performance testing report"""
        print("\n" + "=" * 50)
        print("PERFORMANCE TESTING REPORT")
        print("=" * 50)
        
        # Save detailed report
        with open("performance_report.json", "w") as f:
            json.dump(self.results, f, indent=2)
        
        # Generate summary
        summary = []
        summary.append("PhishGuard Performance Testing Summary")
        summary.append("=" * 40)
        summary.append(f"Test Date: {self.results['timestamp']}")
        summary.append("")
        
        # Health endpoint summary
        health = self.results["health_endpoint"]
        if health["response_times"]:
            summary.append("Health Endpoint:")
            summary.append(f"  Average Response Time: {health['response_times']['mean']:.2f}ms")
            summary.append(f"  Success Rate: {health['success_rate']:.1f}%")
            summary.append("")
        
        # Authentication summary
        auth = self.results["authentication"]
        summary.append("Authentication:")
        if auth.get("login", {}).get("response_times"):
            summary.append(f"  Login Average: {auth['login']['response_times']['mean']:.2f}ms")
        if auth.get("register", {}).get("response_times"):
            summary.append(f"  Registration Average: {auth['register']['response_times']['mean']:.2f}ms")
        summary.append("")
        
        # Scanning summary
        scanning = self.results["scanning"]
        summary.append("Email Scanning:")
        for size, result in scanning.items():
            if result["response_times"]:
                summary.append(f"  {size.capitalize()} Email: {result['response_times']['mean']:.2f}ms")
        summary.append("")
        
        # Concurrent testing summary
        concurrent = self.results["concurrent_requests"]
        summary.append("Concurrent Load Testing:")
        for test_name, result in concurrent.items():
            summary.append(f"  {result['concurrency_level']} concurrent: {result['requests_per_second']:.1f} req/s")
        summary.append("")
        
        # Memory usage summary
        memory = self.results["memory_usage"]
        summary.append("Memory Usage:")
        summary.append(f"  Memory Increase: {memory['memory_increase_mb']:.2f}MB ({memory['memory_increase_percent']:.1f}%)")
        summary.append("")
        
        # Performance recommendations
        summary.append("Performance Recommendations:")
        
        # Check for bottlenecks
        if health.get("response_times") and health["response_times"]["mean"] > 1000:
            summary.append("  WARNING - Health endpoint is slow (>1s)")
        
        if auth.get("login", {}).get("response_times") and auth["login"]["response_times"]["mean"] > 2000:
            summary.append("  WARNING - Login is slow (>2s)")
        
        for size, result in scanning.items():
            if result.get("response_times") and result["response_times"]["mean"] > 5000:
                summary.append(f"  WARNING - {size.capitalize()} email scanning is slow (>5s)")
        
        # Check concurrent performance
        for test_name, result in concurrent.items():
            if result.get("success_rate", 0) < 90:
                summary.append(f"  WARNING - High failure rate with {result['concurrency_level']} concurrent requests")
        
        if isinstance(memory.get("memory_increase_percent"), (int, float)) and memory["memory_increase_percent"] > 50:
            summary.append("  WARNING - High memory usage increase detected")
        
        # Save summary
        with open("performance_summary.txt", "w") as f:
            f.write("\n".join(summary))
        
        print("\n".join(summary))
        print(f"\nDetailed report saved to: performance_report.json")
        print(f"Summary saved to: performance_summary.txt")

def main():
    """Main function"""
    import sys
    
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = "http://localhost:5000"
    
    tester = PerformanceTester(base_url)
    tester.run_all_tests()

if __name__ == "__main__":
    main() 