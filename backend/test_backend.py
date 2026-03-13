"""
test_backend.py - Comprehensive pytest test suite for PlacementPro API using TestClient.

Run:
    cd C:/Users/ASUS/Desktop/PlacementPro/backend
    pytest test_backend.py -v
"""

import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

# Shared state dict to pass tokens and IDs between tests
state: dict = {}

# ══════════════════════════════════════════════════════════════
# AUTH TESTS
# ══════════════════════════════════════════════════════════════
def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_super_admin_login_success(client):
    resp = client.post("/auth/super-admin/login", json={"email": "prajwal@gmail.com", "password": "12345"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["role"] == "super_admin"
    state["super_admin_token"] = data["access_token"]


def test_super_admin_login_invalid(client):
    resp = client.post("/auth/super-admin/login", json={"email": "prajwal@gmail.com", "password": "wrong"})
    assert resp.status_code == 401


def test_tpo_login_success(client):
    resp = client.post("/auth/tpo/login", json={"email": "ishwarya9448@gmail.com", "password": "ishwarya9448"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["role"] == "tpo"
    assert data["college_id"] == "SIT_001"
    state["tpo_token"] = data["access_token"]


def test_tpo_login_wrong_password(client):
    resp = client.post("/auth/tpo/login", json={"email": "ishwarya9448@gmail.com", "password": "wrong"})
    assert resp.status_code == 401


def test_student_login_success(client):
    resp = client.post("/auth/student/login", json={
        "usn": "4SN23CG004",
        "password": "4SN23CG004",
        "college_id": "SIT_001",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["role"] == "student"
    assert data["student"]["name"] == "ISHWARYA"
    state["student_token"] = data["access_token"]
    state["student_usn"] = "4SN23CG004"


def test_student_login_wrong_password(client):
    resp = client.post("/auth/student/login", json={
        "usn": "4SN23CG004", "password": "wrongpass", "college_id": "SIT_001"
    })
    assert resp.status_code == 401


def test_refresh_token(client):
    token = state.get("tpo_token", "")
    resp = client.post("/auth/refresh-token", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


# ══════════════════════════════════════════════════════════════
# SUPER ADMIN TESTS
# ══════════════════════════════════════════════════════════════
def test_list_colleges(client):
    token = state.get("super_admin_token", "")
    resp = client.get("/super-admin/college/list", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1


def test_create_college(client):
    token = state.get("super_admin_token", "")
    resp = client.post("/super-admin/college/add", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "Test University", "place": "Bangalore", "state": "Karnataka"
    })
    assert resp.status_code == 200
    state["test_college_id"] = resp.json()["college_id"]


def test_update_college(client):
    token = state.get("super_admin_token", "")
    cid = state.get("test_college_id", "TU_2026")
    resp = client.put(f"/super-admin/college/{cid}/update",
                      headers={"Authorization": f"Bearer {token}"},
                      json={"place": "Mysore"})
    assert resp.status_code == 200


def test_create_tpo(client):
    token = state.get("super_admin_token", "")
    cid = state.get("test_college_id", "SIT_001")
    resp = client.post("/super-admin/tpo/add", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "Test TPO", "email": "testtpo_unique@test.com",
        "password": "testpass123", "college_id": cid
    })
    assert resp.status_code == 200


def test_list_tpos(client):
    token = state.get("super_admin_token", "")
    resp = client.get("/super-admin/tpo/list", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert "tpos" in resp.json()


def test_stats_overview(client):
    token = state.get("super_admin_token", "")
    resp = client.get("/super-admin/stats/overview", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "total_colleges" in data
    assert "total_students" in data


def test_stats_college(client):
    token = state.get("super_admin_token", "")
    resp = client.get("/super-admin/stats/college/SIT_001", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["student_count"] > 0


# ══════════════════════════════════════════════════════════════
# TPO TESTS
# ══════════════════════════════════════════════════════════════
def test_download_template(client):
    token = state.get("tpo_token", "")
    resp = client.get("/tpo/students/template", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert "spreadsheet" in resp.headers.get("content-type", "")


def test_list_students(client):
    token = state.get("tpo_token", "")
    resp = client.get("/tpo/students/list", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] > 0


def test_list_students_paginated(client):
    token = state.get("tpo_token", "")
    resp = client.get("/tpo/students/list?page=1&limit=5", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()["students"]) <= 5


def test_get_student(client):
    token = state.get("tpo_token", "")
    resp = client.get("/tpo/students/4SN23CG004", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["student"]["name"] == "ISHWARYA"


def test_update_student_by_tpo(client):
    token = state.get("tpo_token", "")
    resp = client.put("/tpo/students/4SN23CG004/update",
                      headers={"Authorization": f"Bearer {token}"},
                      json={"cgpa": 8.5, "backlogs": 0})
    assert resp.status_code == 200


def test_tpo_stats(client):
    token = state.get("tpo_token", "")
    resp = client.get("/tpo/stats", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert "total_students" in resp.json()


def test_logo_get(client):
    token = state.get("tpo_token", "")
    resp = client.get("/tpo/logo", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200


# ══════════════════════════════════════════════════════════════
# DRIVE TESTS
# ══════════════════════════════════════════════════════════════
def test_create_drive(client):
    token = state.get("tpo_token", "")
    resp = client.post("/drive/create", headers={"Authorization": f"Bearer {token}"}, json={
        "company_name": "Infosys",
        "job_role": "System Engineer",
        "package_ctc": "INR 3.6 LPA",
        "work_location": "Bangalore",
        "min_cgpa": 6.0,
        "max_backlogs": 2,
        "eligible_branches": [
            "Computer Science and Engineering",
            "Computer Science and Design",
            "Information Science and Engineering",
            "Artificial Intelligence and Machine Learning"
        ],
        "required_skills": ["Python", "Java"],
        "graduation_years": [2024, 2025],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "drive_id" in data
    state["drive_id"] = data["drive_id"]


def test_list_drives(client):
    token = state.get("tpo_token", "")
    resp = client.get("/drive/list", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()["drives"]) >= 1


def test_get_drive(client):
    token = state.get("tpo_token", "")
    drive_id = state.get("drive_id", "")
    resp = client.get(f"/drive/{drive_id}", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["drive"]["company_name"] == "Infosys"


def test_update_drive(client):
    token = state.get("tpo_token", "")
    drive_id = state.get("drive_id", "")
    resp = client.put(f"/drive/{drive_id}/update",
                      headers={"Authorization": f"Bearer {token}"},
                      json={"package_ctc": "INR 4 LPA"})
    assert resp.status_code == 200


def test_toggle_drive_status(client):
    token = state.get("tpo_token", "")
    drive_id = state.get("drive_id", "")
    resp = client.put(f"/drive/{drive_id}/toggle-status", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    # Toggle back
    client.put(f"/drive/{drive_id}/toggle-status", headers={"Authorization": f"Bearer {token}"})


def test_check_eligibility(client):
    token = state.get("tpo_token", "")
    resp = client.post("/drive/check-eligibility",
                       headers={"Authorization": f"Bearer {token}"},
                       json={"min_cgpa": 6.0, "eligible_branches": ["Computer Science and Engineering"]})
    assert resp.status_code == 200
    assert "eligible_count" in resp.json()


def test_get_applicants_empty(client):
    token = state.get("tpo_token", "")
    drive_id = state.get("drive_id", "")
    resp = client.get(f"/drive/{drive_id}/applicants", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


# ══════════════════════════════════════════════════════════════
# STUDENT TESTS
# ══════════════════════════════════════════════════════════════
def test_get_colleges(client):
    resp = client.get("/student/colleges")
    assert resp.status_code == 200
    colleges = resp.json()["colleges"]
    assert any(c["college_id"] == "SIT_001" for c in colleges)


def test_get_student_profile(client):
    token = state.get("student_token", "")
    resp = client.get("/student/profile", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["student"]["usn"] == "4SN23CG004"


def test_update_student_profile(client):
    token = state.get("student_token", "")
    resp = client.put("/student/profile/update",
                      headers={"Authorization": f"Bearer {token}"},
                      json={
                          "cgpa": 8.2,
                          "backlogs": 0,
                          "skills": ["Python", "Java", "React", "SQL"],
                          "graduation_year": 2025
                      })
    assert resp.status_code == 200
    assert resp.json()["student"]["cgpa"] == 8.2


def test_calculate_score(client):
    token = state.get("student_token", "")
    resp = client.post("/student/calculate-score", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "placement_score" in data


def test_eligible_drives_with_lock_reason(client):
    """CRITICAL TEST: Ineligible drives must have a non-null lock_reason."""
    tpo_token = state.get("tpo_token", "")
    # Create an impossible drive
    resp = client.post("/drive/create", headers={"Authorization": f"Bearer {tpo_token}"}, json={
        "company_name": "LockedCorp",
        "job_role": "Researcher",
        "min_cgpa": 9.9,
        "max_backlogs": 0,
        "eligible_branches": ["Computer Science and Engineering"],
    })
    assert resp.status_code == 200
    state["locked_drive_id"] = resp.json()["drive_id"]

    student_token = state.get("student_token", "")
    resp = client.get("/student/my-eligible-drives", headers={"Authorization": f"Bearer {student_token}"})
    assert resp.status_code == 200
    drives = resp.json()["eligible_drives"]

    ineligible = [d for d in drives if not d["eligible"]]
    assert len(ineligible) > 0

    for d in ineligible:
        assert d["lock_reason"] is not None
        assert len(d["lock_reason"]) > 0


def test_apply_to_drive(client):
    token = state.get("student_token", "")
    drive_id = state.get("drive_id", "")
    resp = client.post("/student/apply",
                       headers={"Authorization": f"Bearer {token}"},
                       json={"drive_id": drive_id})
    assert resp.status_code in (200, 400)
    if resp.status_code == 200:
        state["application_id"] = resp.json().get("application_id")


def test_apply_duplicate_rejection(client):
    drive_id = state.get("drive_id", "")
    token = state.get("student_token", "")
    if not state.get("application_id"):
        pytest.skip("Student was ineligible - skipping duplicate test")
    resp = client.post("/student/apply",
                       headers={"Authorization": f"Bearer {token}"},
                       json={"drive_id": drive_id})
    assert resp.status_code == 409


def test_my_applications(client):
    token = state.get("student_token", "")
    resp = client.get("/student/my-applications", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert "applications" in resp.json()


def test_get_notifications(client):
    token = state.get("student_token", "")
    resp = client.get("/student/notifications", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert "notifications" in resp.json()


def test_get_resume(client):
    token = state.get("student_token", "")
    resp = client.get("/student/resume", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200


def test_unauthenticated_access(client):
    resp = client.get("/student/profile")
    assert resp.status_code == 401


# ══════════════════════════════════════════════════════════════
# APPLICANT STATUS UPDATE
# ══════════════════════════════════════════════════════════════
def test_update_applicant_status(client):
    tpo_token = state.get("tpo_token", "")
    drive_id = state.get("drive_id", "")
    if not state.get("application_id"):
        pytest.skip("No application to update")
    usn = state.get("student_usn", "4SN23CG004")
    resp = client.put(
        f"/drive/{drive_id}/applicants/{usn}/status",
        headers={"Authorization": f"Bearer {tpo_token}"},
        json={"status": "Shortlisted"}
    )
    assert resp.status_code == 200


# ══════════════════════════════════════════════════════════════
# BOT TESTS
# ══════════════════════════════════════════════════════════════
def test_chat_general(client):
    token = state.get("student_token", "")
    resp = client.post("/bot/chat",
                       headers={"Authorization": f"Bearer {token}"},
                       json={"message": "What skills should I learn for software jobs?"})
    assert resp.status_code == 200
    assert "text" in resp.json()


def test_chat_predict(client):
    token = state.get("student_token", "")
    resp = client.post("/bot/chat",
                       headers={"Authorization": f"Bearer {token}"},
                       json={"message": "What are my chances of getting placed?"})
    assert resp.status_code == 200
    assert "text" in resp.json()


def test_chat_empty_message(client):
    token = state.get("student_token", "")
    resp = client.post("/bot/chat",
                       headers={"Authorization": f"Bearer {token}"},
                       json={"message": ""})
    assert resp.status_code == 400


def test_chat_history(client):
    token = state.get("student_token", "")
    resp = client.get("/bot/history", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert "messages" in resp.json()


# ══════════════════════════════════════════════════════════════
# SCHEDULER TESTS
# ══════════════════════════════════════════════════════════════
def test_generate_schedule(client):
    tpo_token = state.get("tpo_token", "")
    drive_id = state.get("drive_id", "")
    resp = client.post("/scheduler/generate",
                       headers={"Authorization": f"Bearer {tpo_token}"},
                       json={
                           "drive_id": drive_id,
                           "date_windows": [{"date": "2025-12-01", "start_time": "09:00", "end_time": "17:00"}],
                           "slot_duration_minutes": 30
                       })
    assert resp.status_code in (200, 400)


# ══════════════════════════════════════════════════════════════
# NOTIFICATIONS TEST
# ══════════════════════════════════════════════════════════════
def test_bulk_notify(client):
    tpo_token = state.get("tpo_token", "")
    resp = client.post("/notifications/send",
                       headers={"Authorization": f"Bearer {tpo_token}"},
                       json={
                           "recipient_usns": ["4SN23CG004", "4SN23CG009"],
                           "title": "Test Notification",
                           "message": "This is a test",
                           "type": "general"
                       })
    assert resp.status_code == 200
    assert resp.json()["notifications_created"] == 2


def test_mark_notification_read(client):
    tpo_token = state.get("tpo_token", "")
    client.post("/notifications/send",
                headers={"Authorization": f"Bearer {tpo_token}"},
                json={
                    "recipient_usns": ["4SN23CG004"],
                    "title": "Read Test", "message": "Please mark me as read", "type": "general"
                })

    student_token = state.get("student_token", "")
    resp = client.get("/student/notifications?unread_only=true",
                      headers={"Authorization": f"Bearer {student_token}"})
    assert resp.status_code == 200
    notifs = resp.json()["notifications"]
    if not notifs:
        pytest.skip("No unread notifications to mark")

    notif_id = notifs[0]["notification_id"]
    resp = client.put("/student/notifications/read",
                      headers={"Authorization": f"Bearer {student_token}"},
                      json={"notification_id": notif_id})
    assert resp.status_code == 200
