-- PostgreSQL production reference only; not a deployed backend.
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE students (id uuid PRIMARY KEY, name text NOT NULL, cohort text,
 integrity_restricted boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE interviewers (id uuid PRIMARY KEY, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE tracks (id uuid PRIMARY KEY, name text UNIQUE NOT NULL);
CREATE TABLE badges (id uuid PRIMARY KEY, track_id uuid NOT NULL REFERENCES tracks, tier text NOT NULL,
 previous_badge_id uuid REFERENCES badges, UNIQUE(track_id,tier));
CREATE TABLE skills (id uuid PRIMARY KEY, name text UNIQUE NOT NULL);
CREATE TABLE badge_skill_requirements (badge_id uuid REFERENCES badges, skill_id uuid REFERENCES skills,
 required_level integer NOT NULL CHECK(required_level>0), PRIMARY KEY(badge_id,skill_id));
CREATE TABLE student_skill_progress (student_id uuid REFERENCES students, skill_id uuid REFERENCES skills,
 cleared_level integer NOT NULL CHECK(cleared_level>=0), verified_at timestamptz NOT NULL, PRIMARY KEY(student_id,skill_id));
-- Discrete slots are also interviewer availability. History-bearing slots are immutable.
CREATE TABLE interview_slots (id uuid PRIMARY KEY, interviewer_id uuid NOT NULL REFERENCES interviewers,
 start_at timestamptz NOT NULL, end_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(end_at=start_at+interval '30 minutes'), UNIQUE(id,interviewer_id),
 EXCLUDE USING gist(interviewer_id WITH =,tstzrange(start_at,end_at,'[)') WITH &&));
CREATE TABLE interview_attempts (id uuid PRIMARY KEY, student_id uuid NOT NULL REFERENCES students,
 badge_id uuid NOT NULL REFERENCES badges, slot_id uuid NOT NULL REFERENCES interview_slots,
 attempt_no integer NOT NULL CHECK(attempt_no>0),
 booking_status text NOT NULL CHECK(booking_status IN ('BOOKED','COMPLETED','CANCELLED','NO_SHOW')),
 outcome text CHECK(outcome IN ('PASS','FAIL','RETAKE_LATER')), result_at timestamptz,
 notes text, retry_authorized boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(student_id,badge_id,attempt_no), UNIQUE(id,student_id,badge_id),
 CHECK((outcome IS NULL AND result_at IS NULL) OR (booking_status='COMPLETED' AND outcome IS NOT NULL AND result_at IS NOT NULL)));
CREATE UNIQUE INDEX one_active_journey ON interview_attempts(student_id,badge_id)
 WHERE booking_status='BOOKED' OR (booking_status='COMPLETED' AND outcome IS NULL);
CREATE UNIQUE INDEX one_booked_slot ON interview_attempts(slot_id) WHERE booking_status='BOOKED';
-- Projection maintained by a trusted transaction/trigger, never by clients.
-- Trigger must copy interviewer/range from the immutable referenced slot and
-- retain only BOOKED rows; remove reservation atomically on cancellation/completion.
CREATE TABLE active_reservations (attempt_id uuid PRIMARY KEY REFERENCES interview_attempts,
 student_id uuid NOT NULL REFERENCES students, slot_id uuid NOT NULL UNIQUE,
 interviewer_id uuid NOT NULL, period tstzrange NOT NULL,
 FOREIGN KEY(slot_id,interviewer_id) REFERENCES interview_slots(id,interviewer_id),
 EXCLUDE USING gist(student_id WITH =, period WITH &&),
 EXCLUDE USING gist(interviewer_id WITH =, period WITH &&));
CREATE TABLE badge_awards (id uuid PRIMARY KEY, student_id uuid NOT NULL REFERENCES students,
 badge_id uuid NOT NULL REFERENCES badges, attempt_id uuid NOT NULL UNIQUE,
 validity text NOT NULL CHECK(validity IN ('VALID','INVALIDATED')),
 awarded_at timestamptz NOT NULL, invalidated_at timestamptz, invalidation_reason text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(student_id,badge_id), FOREIGN KEY(attempt_id,student_id,badge_id) REFERENCES interview_attempts(id,student_id,badge_id),
 CHECK(validity!='INVALIDATED' OR (invalidated_at IS NOT NULL AND length(invalidation_reason)>=8)));
-- Transaction must verify qualifying attempt is PASS and eligibility still holds.
CREATE TABLE integrity_flags (id uuid PRIMARY KEY, student_id uuid NOT NULL REFERENCES students,
 award_id uuid REFERENCES badge_awards, reason text NOT NULL, confirmed_by uuid NOT NULL,
 confirmed_at timestamptz NOT NULL, overturned_at timestamptz, overturned_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE audit_events (id uuid PRIMARY KEY, actor_id uuid NOT NULL, actor_role text NOT NULL,
 action text NOT NULL, entity_id uuid NOT NULL, reason text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE mutation_keys (actor_id uuid NOT NULL, key text NOT NULL, request_hash text NOT NULL,
 response jsonb, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(actor_id,key));
CREATE INDEX slots_by_interviewer_time ON interview_slots(interviewer_id,start_at);
CREATE INDEX attempts_by_student_badge ON interview_attempts(student_id,badge_id);
CREATE INDEX attempts_by_status ON interview_attempts(booking_status);
CREATE INDEX flags_by_student ON integrity_flags(student_id);
CREATE INDEX audit_by_entity_time ON audit_events(entity_id,created_at DESC);
-- Required application/DB functions (not implemented here): authoritative eligibility,
-- row locking in deterministic order; reservation projection trigger; role/ownership
-- authorization; immutable outcome policy; pass-to-award transaction; append-only
-- audit permissions; idempotent request handling and privacy-aware read policies.
