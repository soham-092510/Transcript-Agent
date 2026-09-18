import os
import time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

from backend.app.models.schemas import (
    LearningSession, TranscriptSegment, FrameCapture, Concept,
    QuizQuestion, ChatMessage, TaskState, VisualCategory, TeacherMode
)
from backend.app.db.database import DatabaseManager, get_session_dir

class DemoDataService:
    """
    Seeds a high-fidelity educational session with realistic visual slides,
    timestamped transcripts, grounded concepts, and practice questions.
    Allows instant demonstration and verification of all multimodal capabilities.
    """

    @classmethod
    def seed_demo_session(cls) -> str:
        session_id = "demo_cybersecurity_module_2"
        # Check if demo session already exists
        existing = DatabaseManager.get_session(session_id)
        if existing:
            return existing.id
        session_dir = get_session_dir(session_id)
        screenshots_dir = session_dir / "screenshots"

        # 1. Create Learning Session
        session = LearningSession(
            id=session_id,
            title="Cybersecurity & Cloud Fundamentals - Module 2: Network Firewalls",
            source_platform="Fortinet Training Institute",
            source_url_or_title="Fortinet NSE 2 - Lesson 2.4",
            created_at=time.time() - 3600,
            updated_at=time.time(),
            duration_sec=1420.0,
            progress_pct=85,
            status=TaskState.COMPLETED,
            is_pinned=True,
            tags=["Network Security", "Firewalls", "Cloud Architecture", "NSE2"]
        )
        DatabaseManager.create_session(session)

        # 2. Generate Real Synthetic Slide Images
        frame_1_path = screenshots_dir / "slide_01_firewall_arch.jpg"
        frame_1_thumb = screenshots_dir / "thumb_01_firewall_arch.jpg"
        cls._render_architecture_slide(frame_1_path)
        cls._render_thumbnail(frame_1_path, frame_1_thumb)

        frame_2_path = screenshots_dir / "slide_02_stateful_table.jpg"
        frame_2_thumb = screenshots_dir / "thumb_02_stateful_table.jpg"
        cls._render_table_slide(frame_2_path)
        cls._render_thumbnail(frame_2_path, frame_2_thumb)

        frame_3_path = screenshots_dir / "slide_03_zero_trust.jpg"
        frame_3_thumb = screenshots_dir / "thumb_03_zero_trust.jpg"
        cls._render_concept_slide(frame_3_path)
        cls._render_thumbnail(frame_3_path, frame_3_thumb)

        # Add FrameCaptures
        f1 = FrameCapture(
            id="frame_demo_01",
            session_id=session_id,
            timestamp_sec=180.0,
            timestamp_formatted="03:00",
            image_path=str(frame_1_path),
            thumbnail_path=str(frame_1_thumb),
            ocr_text="Network Firewall Architecture\nInternet -> External Interface -> Firewall Inspection -> Internal LAN & DMZ",
            visual_description="Network topology diagram showing perimeter firewall filtering between Untrusted WAN and Protected LAN.",
            category=VisualCategory.DIAGRAM,
            importance_score=0.96,
            concepts=["Firewall", "Perimeter Security", "DMZ"],
            is_pinned=True
        )
        DatabaseManager.add_frame(f1)

        f2 = FrameCapture(
            id="frame_demo_02",
            session_id=session_id,
            timestamp_sec=872.0,
            timestamp_formatted="14:32",
            image_path=str(frame_2_path),
            thumbnail_path=str(frame_2_thumb),
            ocr_text="Stateful Inspection Table\nSource IP | Dest IP | Protocol | State | Action\n192.168.1.50 | 10.0.0.1 | TCP | ESTABLISHED | ALLOW\nAny | 192.168.1.* | Any | SYN | DENY",
            visual_description="Comparison table illustrating stateful inspection rules and dynamic connection state tracking.",
            category=VisualCategory.TABLE,
            importance_score=0.92,
            concepts=["Stateful Inspection", "Packet Filtering"],
            is_pinned=True
        )
        DatabaseManager.add_frame(f2)

        f3 = FrameCapture(
            id="frame_demo_03",
            session_id=session_id,
            timestamp_sec=1122.0,
            timestamp_formatted="18:42",
            image_path=str(frame_3_path),
            thumbnail_path=str(frame_3_thumb),
            ocr_text="Zero Trust Network Access (ZTNA)\nNever Trust, Always Verify\nIdentity Verification + Device Posture + Least Privilege Access",
            visual_description="Three-tier conceptual slide breaking down Zero Trust principles and continuous posture checking.",
            category=VisualCategory.SLIDE,
            importance_score=0.88,
            concepts=["Zero Trust", "ZTNA", "Least Privilege"],
            is_pinned=False
        )
        DatabaseManager.add_frame(f3)

        # 3. Add Realistic Transcript Segments
        transcript_data = [
            (0.0, 120.0, "00:00", "Welcome to Module 2. Today we examine the fundamental perimeter barrier in modern infrastructure: the network firewall."),
            (121.0, 240.0, "02:01", "A firewall monitors and controls incoming and outgoing network traffic according to predetermined security policies."),
            (241.0, 520.0, "04:01", "Looking at the slide diagram at 03:00, observe how traffic from the public Internet must traverse our inspection gateway before reaching our corporate DMZ and internal LAN."),
            (521.0, 870.0, "08:41", "Historically, firewalls only did packet filtering. They examined source and destination IP addresses, ports, and protocols in isolation without context."),
            (871.0, 1100.0, "14:32", "In modern networks, we utilize stateful inspection. Look at the state table on the screen. A stateful firewall tracks the entire lifecycle of a TCP handshake."),
            (1101.0, 1300.0, "18:42", "Finally, in modern cloud architectures, we transition towards Zero Trust. The golden principle of Zero Trust is: Never Trust, Always Verify."),
            (1301.0, 1420.0, "21:41", "For your certification exam, remember that firewall rules are processed sequentially, and the Default Deny rule applies to unmatched traffic.")
        ]
        for t_start, t_end, t_fmt, text in transcript_data:
            DatabaseManager.add_transcript_segment(TranscriptSegment(
                session_id=session_id,
                timestamp_start=t_start,
                timestamp_end=t_end,
                timestamp_formatted=t_fmt,
                speaker="Lead Instructor",
                text=text,
                confidence=0.98,
                topic="Firewalls & Perimeter Security"
            ))

        # 4. Add Grounded Concepts
        c1 = Concept(
            id="concept_demo_01",
            session_id=session_id,
            name="Network Firewall",
            definition="A foundational security barrier that monitors and regulates incoming and outgoing network traffic based on configured rules.",
            simple_explanation="Think of a firewall as an airport security scanner that checks incoming passengers (packets) against an authorized list before letting them inside.",
            deep_explanation="Operates at network layer (OSI Layer 3/4) and application layer (Layer 7), evaluating packet headers, connection state tables, and payload signatures.",
            evidence_timestamp="02:01",
            evidence_frame_id="frame_demo_01",
            related_concepts=["Packet Filtering", "Stateful Inspection", "DMZ"],
            exam_importance="High",
            difficulty="Beginner",
            is_pinned=True
        )
        DatabaseManager.add_concept(c1)

        c2 = Concept(
            id="concept_demo_02",
            session_id=session_id,
            name="Stateful Inspection",
            definition="A firewall technology that monitors the active state and context of established network connections across the TCP session.",
            simple_explanation="Instead of looking at each letter individually, the guard remembers who you were having a conversation with and lets reply letters pass automatically.",
            deep_explanation="Maintains a dynamic state table. Incoming return packets are matched against established outbound connection records to prevent spoofing and unsolicited SYN packets.",
            evidence_timestamp="14:32",
            evidence_frame_id="frame_demo_02",
            related_concepts=["Network Firewall", "TCP Handshake", "Default Deny"],
            exam_importance="High",
            difficulty="Intermediate",
            is_pinned=True
        )
        DatabaseManager.add_concept(c2)

        c3 = Concept(
            id="concept_demo_03",
            session_id=session_id,
            name="Zero Trust Network Access (ZTNA)",
            definition="A modern security paradigm that eliminates implicit trust and mandates continuous verification of user identity and device posture.",
            simple_explanation="Zero Trust means nobody gets a permanent building key. Every door requires your badge and identity check every single time you walk through it.",
            deep_explanation="Replaces traditional perimeter castle-and-moat security with micro-segmentation, identity-aware proxies, and least-privilege access policies.",
            evidence_timestamp="18:42",
            evidence_frame_id="frame_demo_03",
            related_concepts=["Least Privilege", "Microsegmentation", "Identity Provider"],
            exam_importance="High",
            difficulty="Advanced",
            is_pinned=False
        )
        DatabaseManager.add_concept(c3)

        # 5. Add Practice Quiz Questions
        q1 = QuizQuestion(
            session_id=session_id,
            question="What is the key advantage of a stateful firewall over a traditional stateless packet filter?",
            options=[
                "It monitors active connection states in a state table to validate return traffic",
                "It increases physical cable transmission speeds by compressing raw packet bytes",
                "It bypasses the need for access control lists or IP addresses",
                "It operates solely at the physical layer of the OSI model"
            ],
            correct_option_index=0,
            concept_tested="Stateful Inspection",
            relevant_timestamp="14:32",
            explanation="Stateful firewalls maintain a state table tracking active sessions, allowing valid return packets while blocking unsolicited incoming traffic."
        )
        DatabaseManager.add_quiz_question(q1)

        q2 = QuizQuestion(
            session_id=session_id,
            question="According to the instructor, what is the default behavior for network traffic that matches none of the configured firewall rules?",
            options=[
                "Default Allow (Traffic is forwarded)",
                "Default Deny (Traffic is blocked and logged)",
                "Traffic is duplicated and sent to all network ports",
                "Traffic is rerouted to the public DNS resolver"
            ],
            correct_option_index=1,
            concept_tested="Network Firewall",
            relevant_timestamp="21:41",
            explanation="The Default Deny rule is a core security posture ensuring any unclassified or unexpected traffic is rejected."
        )
        DatabaseManager.add_quiz_question(q2)

        # 6. Add Initial Chat Messages
        msg1 = ChatMessage(
            session_id=session_id,
            sender="user",
            text="What did the instructor teach about stateful vs stateless firewalls?",
            mode=TeacherMode.SIMPLE,
            timestamp=time.time() - 300
        )
        DatabaseManager.add_chat_message(msg1)

        msg2 = ChatMessage(
            session_id=session_id,
            sender="assistant",
            text=(
                "According to your lesson at **14:32**, here is the essential difference:\n\n"
                "• **Stateless Packet Filter**: Evaluates each packet in complete isolation based only on its IP and port headers. It has no memory of past packets.\n"
                "• **Stateful Inspection**: Maintains an active **Connection State Table** (as shown on the slide at 14:32). When you establish an outbound connection (e.g. visiting a website), the return packets are automatically recognized and permitted.\n\n"
                "> **Exam Tip**: Certification exams test this distinction heavily! Always remember that stateful tracking prevents unsolicited inbound SYN attacks."
            ),
            mode=TeacherMode.SIMPLE,
            timestamp=time.time() - 290,
            evidence=[{
                "timestamp": "14:32",
                "timestamp_sec": 872.0,
                "frame_id": "frame_demo_02",
                "thumbnail_url": "/api/frames/frame_demo_02/thumbnail",
                "quote": "A stateful firewall tracks the entire lifecycle of a TCP handshake.",
                "concept_name": "Stateful Inspection"
            }]
        )
        DatabaseManager.add_chat_message(msg2)

        # Update session counts
        DatabaseManager.update_session(session_id, {
            "topic_count": 3,
            "concept_count": 3,
            "screenshot_count": 3,
            "question_count": 2
        })

        return session_id

    @staticmethod
    def _render_architecture_slide(path: Path):
        img = Image.new('RGB', (1280, 720), color=(15, 23, 42))
        draw = ImageDraw.Draw(img)

        # Header
        draw.text((60, 40), "NETWORK FIREWALL ARCHITECTURE", fill=(34, 197, 94))
        draw.text((60, 70), "Perimeter Defense & Segmented Inspection Zones", fill=(248, 250, 252))

        # Nodes
        # Internet
        draw.rounded_rectangle([(100, 240), (320, 440)], radius=15, fill=(30, 41, 59), outline=(6, 182, 212), width=3)
        draw.text((140, 320), "PUBLIC INTERNET\n(Untrusted Zone)", fill=(248, 250, 252))

        # Arrow
        draw.line([(325, 340), (495, 340)], fill=(34, 197, 94), width=4)

        # Firewall
        draw.rounded_rectangle([(500, 200), (780, 480)], radius=15, fill=(22, 101, 52), outline=(34, 197, 94), width=4)
        draw.text((540, 310), "ENTERPRISE FIREWALL\n• Stateful Inspection\n• Rule Matrix\n• Default Deny", fill=(255, 255, 255))

        # Arrow
        draw.line([(785, 340), (955, 340)], fill=(34, 197, 94), width=4)

        # Internal LAN
        draw.rounded_rectangle([(960, 240), (1180, 440)], radius=15, fill=(30, 41, 59), outline=(139, 92, 246), width=3)
        draw.text((990, 320), "CORPORATE LAN\n& DMZ Servers", fill=(248, 250, 252))

        # Footer
        draw.text((60, 650), "Fortinet NSE Training Institute  •  Lesson 2.4", fill=(148, 163, 184))
        img.save(str(path), "JPEG", quality=90)

    @staticmethod
    def _render_table_slide(path: Path):
        img = Image.new('RGB', (1280, 720), color=(15, 23, 42))
        draw = ImageDraw.Draw(img)

        draw.text((60, 40), "STATEFUL CONNECTION TABLE", fill=(6, 182, 212))
        draw.text((60, 70), "Dynamic TCP Handshake and Session State Tracking", fill=(248, 250, 252))

        # Table Box
        draw.rounded_rectangle([(80, 160), (1200, 560)], radius=12, fill=(30, 41, 59), outline=(100, 116, 139), width=2)

        # Header Row
        draw.rectangle([(80, 160), (1200, 230)], fill=(51, 65, 85))
        draw.text((110, 185), "SOURCE IP", fill=(248, 250, 252))
        draw.text((360, 185), "DESTINATION IP", fill=(248, 250, 252))
        draw.text((640, 185), "PROTO", fill=(248, 250, 252))
        draw.text((820, 185), "STATE", fill=(248, 250, 252))
        draw.text((1020, 185), "ACTION", fill=(248, 250, 252))

        # Rows
        rows = [
            ("192.168.1.50:49201", "104.244.42.1:443", "TCP", "ESTABLISHED", "PERMIT"),
            ("192.168.1.82:53412", "142.250.190.46:80", "TCP", "SYN_SENT", "PERMIT"),
            ("203.0.113.88:1433", "192.168.1.10:1433", "TCP", "UNSOLICITED", "DENY & LOG"),
            ("0.0.0.0/0", "0.0.0.0/0", "ANY", "DEFAULT", "DROP")
        ]
        y = 250
        for r in rows:
            draw.text((110, y), r[0], fill=(226, 232, 240))
            draw.text((360, y), r[1], fill=(226, 232, 240))
            draw.text((640, y), r[2], fill=(226, 232, 240))
            draw.text((820, y), r[3], fill=(34, 197, 94) if "ESTABLISHED" in r[3] else (245, 158, 11))
            draw.text((1020, y), r[4], fill=(34, 197, 94) if "PERMIT" in r[4] else (239, 68, 68))
            draw.line([(80, y + 45), (1200, y + 45)], fill=(71, 85, 105), width=1)
            y += 70

        draw.text((60, 650), "State table entries expire dynamically upon TCP FIN or idle timeout.", fill=(148, 163, 184))
        img.save(str(path), "JPEG", quality=90)

    @staticmethod
    def _render_concept_slide(path: Path):
        img = Image.new('RGB', (1280, 720), color=(15, 23, 42))
        draw = ImageDraw.Draw(img)

        draw.text((60, 40), "ZERO TRUST NETWORK ACCESS (ZTNA)", fill=(139, 92, 246))
        draw.text((60, 70), "Core Axiom: 'Never Trust, Always Verify'", fill=(248, 250, 252))

        # 3 Pillar Cards
        cards = [
            ("1. IDENTITY VERIFICATION", "Every request authenticated via MFA and identity providers prior to granting network access.", (6, 182, 212)),
            ("2. DEVICE POSTURE CHECK", "Continuous validation of device compliance, EDR agent status, and OS patch levels.", (34, 197, 94)),
            ("3. LEAST PRIVILEGE", "Access granted solely to specific authorized applications rather than the entire network subnet.", (245, 158, 11))
        ]

        x_coords = [80, 460, 840]
        for i, (title, desc, color) in enumerate(cards):
            x = x_coords[i]
            draw.rounded_rectangle([(x, 180), (x + 360, 540)], radius=14, fill=(30, 41, 59), outline=color, width=3)
            draw.text((x + 24, 220), title, fill=color)
            # multi-line text
            words = desc.split()
            lines = []
            curr = []
            for w in words:
                curr.append(w)
                if len(" ".join(curr)) > 26:
                    lines.append(" ".join(curr[:-1]))
                    curr = [w]
            if curr:
                lines.append(" ".join(curr))
            
            y_text = 280
            for l in lines:
                draw.text((x + 24, y_text), l, fill=(226, 232, 240))
                y_text += 32

        draw.text((60, 650), "Zero Trust replaces implicit perimeter trust with dynamic micro-perimeters.", fill=(148, 163, 184))
        img.save(str(path), "JPEG", quality=90)

    @staticmethod
    def _render_thumbnail(src: Path, dest: Path):
        img = Image.open(src)
        img.thumbnail((320, 180), Image.Resampling.LANCZOS)
        img.save(dest, "JPEG", quality=80)

demo_service = DemoDataService()
