import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location(
    "deployment", Path(__file__).resolve().parents[1] / "github-deployment.py"
)
deployment = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deployment)


class DeploymentReportingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.output = Path(self.temp.name) / "output"
        env = patch.dict(os.environ, {
            "GITHUB_SHA": "a" * 40,
            "GITHUB_SERVER_URL": "https://github.com",
            "GITHUB_REPOSITORY": "example/site",
            "GITHUB_RUN_ID": "123",
            "GITHUB_RUN_ATTEMPT": "2",
            "GITHUB_OUTPUT": str(self.output),
            "DEPLOYMENT_ID": "42",
            "DEPLOYMENT_URL": "https://example.com",
        }, clear=True)
        env.start()
        self.addCleanup(env.stop)

    @patch.object(deployment, "post", return_value={"id": 42})
    def test_create_exact_commit_and_pending(self, post):
        deployment.main("create")
        endpoint, payload = post.call_args_list[0].args
        self.assertEqual(endpoint, "deployments")
        self.assertEqual(payload["ref"], "a" * 40)
        self.assertFalse(payload["auto_merge"])
        self.assertEqual(payload["required_contexts"], [])
        self.assertTrue(payload["production_environment"])
        self.assertEqual(self.output.read_text(), "deployment_id=42\n")
        endpoint, payload = post.call_args_list[1].args
        self.assertEqual(endpoint, "deployments/42/statuses")
        self.assertEqual(payload["state"], "pending")
        self.assertEqual(payload["environment_url"], "https://example.com")
        self.assertTrue(payload["log_url"].endswith("/123/attempts/2"))

    @patch.object(deployment, "post", side_effect=[{"id": 42}, RuntimeError("API unavailable")])
    def test_id_saved_before_pending_failure(self, post):
        with self.assertRaises(RuntimeError):
            deployment.main("create")
        self.assertEqual(self.output.read_text(), "deployment_id=42\n")

    @patch.object(deployment, "post", side_effect=RuntimeError("API unavailable"))
    def test_creation_failure_does_not_save_id(self, post):
        with self.assertRaises(RuntimeError):
            deployment.main("create")
        self.assertFalse(self.output.exists())

    @patch.object(deployment, "post")
    def test_progress_and_optional_url(self, post):
        del os.environ["DEPLOYMENT_URL"]
        deployment.main("in_progress")
        payload = post.call_args.args[1]
        self.assertEqual(payload["state"], "in_progress")
        self.assertNotIn("environment_url", payload)

    @patch.object(deployment, "post")
    def test_final_states(self, post):
        for result, expected in [("success", "success"), ("failure", "failure"), ("cancelled", "error")]:
            with self.subTest(result=result):
                os.environ["DEPLOYMENT_RESULT"] = result
                deployment.main("finish")
                self.assertEqual(post.call_args.args[1]["state"], expected)

    @patch.object(deployment, "post")
    def test_invalid_id_never_calls_api(self, post):
        os.environ["DEPLOYMENT_ID"] = "invalid/42"
        with self.assertRaises(ValueError):
            deployment.main("in_progress")
        post.assert_not_called()


if __name__ == "__main__":
    unittest.main()
