--
-- PostgreSQL database dump
--

\restrict 9U9uOTdnmsumhGYeKRAfZh4QuntrVdnTay2bXHs24RJ4GTTk7fTjyqEuevc4fv8

-- Dumped from database version 17.7 (bdc8956)
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AbsenceRecords; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AbsenceRecords" (
    id integer NOT NULL,
    "memberId" integer NOT NULL,
    "reportId" integer NOT NULL,
    "absenceType" text NOT NULL,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AbsenceRecords_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."AbsenceRecords_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AbsenceRecords_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."AbsenceRecords_id_seq" OWNED BY public."AbsenceRecords".id;


--
-- Name: ApprovalRequests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ApprovalRequests" (
    id text NOT NULL,
    "reportId" text NOT NULL,
    "requesterId" text NOT NULL,
    "approverId" text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "executiveSignature" text
);


--
-- Name: Assessment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Assessment" (
    id text NOT NULL,
    "courseId" text NOT NULL,
    question text NOT NULL,
    options text NOT NULL,
    "correctAnswer" integer NOT NULL,
    difficulty text DEFAULT 'medium'::text NOT NULL
);


--
-- Name: Attachment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Attachment" (
    id text NOT NULL,
    url text NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'file'::text NOT NULL,
    size integer DEFAULT 0 NOT NULL,
    "mimeType" text DEFAULT 'application/octet-stream'::text NOT NULL,
    rotation integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "noticeId" text,
    "commentId" text,
    "reportDetailId" integer,
    "courseId" text
);


--
-- Name: Certificate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Certificate" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "courseId" text NOT NULL,
    "certificateUrl" text NOT NULL,
    "issuedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "certificateNumber" text NOT NULL,
    score integer
);


--
-- Name: ChecklistTemplates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ChecklistTemplates" (
    id integer NOT NULL,
    name text NOT NULL,
    "teamId" integer NOT NULL
);


--
-- Name: ChecklistTemplates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ChecklistTemplates_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ChecklistTemplates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ChecklistTemplates_id_seq" OWNED BY public."ChecklistTemplates".id;


--
-- Name: Comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Comment" (
    id text NOT NULL,
    content text NOT NULL,
    "imageUrl" text,
    "authorId" text NOT NULL,
    "noticeId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Course; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Course" (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    type text NOT NULL,
    duration integer NOT NULL,
    "videoUrl" text,
    "videoType" text,
    "audioUrl" text,
    "documentUrl" text,
    color text DEFAULT 'blue'::text NOT NULL,
    icon text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DailyReports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DailyReports" (
    id integer NOT NULL,
    "teamId" integer NOT NULL,
    "reportDate" timestamp(3) without time zone NOT NULL,
    "managerName" text,
    remarks text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    site text
);


--
-- Name: DailyReports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."DailyReports_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: DailyReports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."DailyReports_id_seq" OWNED BY public."DailyReports".id;


--
-- Name: EmailLogs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmailLogs" (
    id text NOT NULL,
    "emailType" text NOT NULL,
    "recipientId" text NOT NULL,
    "recipientEmail" text NOT NULL,
    subject text NOT NULL,
    "sentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    "errorMessage" text
);


--
-- Name: Factories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Factories" (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Factories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Factories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Factories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Factories_id_seq" OWNED BY public."Factories".id;


--
-- Name: Holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Holidays" (
    id integer NOT NULL,
    date date NOT NULL,
    name text NOT NULL,
    "isRecurring" boolean DEFAULT false NOT NULL,
    site text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Holidays_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Holidays_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Holidays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Holidays_id_seq" OWNED BY public."Holidays".id;


--
-- Name: InspectionItems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InspectionItems" (
    id text NOT NULL,
    "inspectionId" text NOT NULL,
    "equipmentName" text NOT NULL,
    "requiredPhotoCount" integer NOT NULL,
    photos jsonb NOT NULL,
    remarks text,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: InspectionScheduleTemplates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InspectionScheduleTemplates" (
    id integer NOT NULL,
    "factoryId" integer NOT NULL,
    month integer NOT NULL,
    "equipmentName" text NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: InspectionScheduleTemplates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."InspectionScheduleTemplates_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: InspectionScheduleTemplates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."InspectionScheduleTemplates_id_seq" OWNED BY public."InspectionScheduleTemplates".id;


--
-- Name: InspectionTemplates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InspectionTemplates" (
    id integer NOT NULL,
    "teamId" integer NOT NULL,
    month integer DEFAULT 1 NOT NULL,
    "equipmentName" text NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "isRequired" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: InspectionTemplates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."InspectionTemplates_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: InspectionTemplates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."InspectionTemplates_id_seq" OWNED BY public."InspectionTemplates".id;


--
-- Name: MonthlyApproval; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MonthlyApproval" (
    id text NOT NULL,
    "teamId" integer NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "pdfUrl" text,
    "approverId" text,
    "submittedAt" timestamp(3) without time zone,
    "approvedAt" timestamp(3) without time zone
);


--
-- Name: MonthlyInspectionDays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MonthlyInspectionDays" (
    id integer NOT NULL,
    "factoryId" integer NOT NULL,
    month integer NOT NULL,
    "inspectionDay" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MonthlyInspectionDays_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."MonthlyInspectionDays_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: MonthlyInspectionDays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."MonthlyInspectionDays_id_seq" OWNED BY public."MonthlyInspectionDays".id;


--
-- Name: Notice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notice" (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "authorId" text NOT NULL,
    category text DEFAULT 'GENERAL'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "viewCount" integer DEFAULT 0 NOT NULL,
    "imageUrl" text,
    "attachmentUrl" text,
    "attachmentName" text,
    "videoUrl" text,
    "videoType" text
);


--
-- Name: NoticeReads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NoticeReads" (
    id text NOT NULL,
    "noticeId" text NOT NULL,
    "userId" text NOT NULL,
    "readAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PasswordResetToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PasswordResetToken" (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ReportDetails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReportDetails" (
    id integer NOT NULL,
    "reportId" integer NOT NULL,
    "itemId" integer NOT NULL,
    "checkState" text,
    "authorId" text,
    "actionDescription" text,
    "actionStatus" text DEFAULT 'PENDING'::text
);


--
-- Name: ReportDetails_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ReportDetails_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ReportDetails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ReportDetails_id_seq" OWNED BY public."ReportDetails".id;


--
-- Name: ReportSignatures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReportSignatures" (
    id integer NOT NULL,
    "reportId" integer NOT NULL,
    "userId" text,
    "memberId" integer,
    "signedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "signatureImage" text
);


--
-- Name: ReportSignatures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ReportSignatures_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ReportSignatures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ReportSignatures_id_seq" OWNED BY public."ReportSignatures".id;


--
-- Name: SafetyInspections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SafetyInspections" (
    id text NOT NULL,
    "teamId" integer NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    "inspectionDate" timestamp(3) without time zone NOT NULL,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SimpleEmailConfigs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SimpleEmailConfigs" (
    id text NOT NULL,
    "emailType" text NOT NULL,
    subject text NOT NULL,
    content text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "sendTiming" text NOT NULL,
    "daysAfter" integer,
    "scheduledTime" text,
    "monthlyDay" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TeamEquipments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TeamEquipments" (
    id integer NOT NULL,
    "teamId" integer NOT NULL,
    "equipmentName" text NOT NULL,
    quantity integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TeamEquipments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."TeamEquipments_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TeamEquipments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."TeamEquipments_id_seq" OWNED BY public."TeamEquipments".id;


--
-- Name: TeamMembers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TeamMembers" (
    id integer NOT NULL,
    "teamId" integer NOT NULL,
    "userId" text,
    name text NOT NULL,
    "position" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TeamMembers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."TeamMembers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TeamMembers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."TeamMembers_id_seq" OWNED BY public."TeamMembers".id;


--
-- Name: Teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Teams" (
    id integer NOT NULL,
    name text NOT NULL,
    site text,
    "factoryId" integer,
    "leaderId" text,
    "approverId" text
);


--
-- Name: Teams_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Teams_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Teams_id_seq" OWNED BY public."Teams".id;


--
-- Name: TemplateItems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TemplateItems" (
    id integer NOT NULL,
    "templateId" integer NOT NULL,
    category text NOT NULL,
    "subCategory" text,
    description text NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL
);


--
-- Name: TemplateItems_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."TemplateItems_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TemplateItems_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."TemplateItems_id_seq" OWNED BY public."TemplateItems".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    username text NOT NULL,
    name text,
    email text,
    password text,
    role text DEFAULT 'PENDING'::text NOT NULL,
    site text,
    "teamId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "failedLoginAttempts" integer DEFAULT 0 NOT NULL,
    "lockedUntil" timestamp(3) without time zone
);


--
-- Name: UserAssessment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserAssessment" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "courseId" text NOT NULL,
    score integer NOT NULL,
    "totalQuestions" integer NOT NULL,
    passed boolean NOT NULL,
    "attemptNumber" integer DEFAULT 1 NOT NULL,
    "completedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: UserProgress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserProgress" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "courseId" text NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    "currentStep" integer DEFAULT 1 NOT NULL,
    "timeSpent" integer DEFAULT 0 NOT NULL,
    "lastAccessed" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: AbsenceRecords id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AbsenceRecords" ALTER COLUMN id SET DEFAULT nextval('public."AbsenceRecords_id_seq"'::regclass);


--
-- Name: ChecklistTemplates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChecklistTemplates" ALTER COLUMN id SET DEFAULT nextval('public."ChecklistTemplates_id_seq"'::regclass);


--
-- Name: DailyReports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyReports" ALTER COLUMN id SET DEFAULT nextval('public."DailyReports_id_seq"'::regclass);


--
-- Name: Factories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Factories" ALTER COLUMN id SET DEFAULT nextval('public."Factories_id_seq"'::regclass);


--
-- Name: Holidays id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Holidays" ALTER COLUMN id SET DEFAULT nextval('public."Holidays_id_seq"'::regclass);


--
-- Name: InspectionScheduleTemplates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InspectionScheduleTemplates" ALTER COLUMN id SET DEFAULT nextval('public."InspectionScheduleTemplates_id_seq"'::regclass);


--
-- Name: InspectionTemplates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InspectionTemplates" ALTER COLUMN id SET DEFAULT nextval('public."InspectionTemplates_id_seq"'::regclass);


--
-- Name: MonthlyInspectionDays id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MonthlyInspectionDays" ALTER COLUMN id SET DEFAULT nextval('public."MonthlyInspectionDays_id_seq"'::regclass);


--
-- Name: ReportDetails id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReportDetails" ALTER COLUMN id SET DEFAULT nextval('public."ReportDetails_id_seq"'::regclass);


--
-- Name: ReportSignatures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReportSignatures" ALTER COLUMN id SET DEFAULT nextval('public."ReportSignatures_id_seq"'::regclass);


--
-- Name: TeamEquipments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeamEquipments" ALTER COLUMN id SET DEFAULT nextval('public."TeamEquipments_id_seq"'::regclass);


--
-- Name: TeamMembers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TeamMembers" ALTER COLUMN id SET DEFAULT nextval('public."TeamMembers_id_seq"'::regclass);


--
-- Name: Teams id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Teams" ALTER COLUMN id SET DEFAULT nextval('public."Teams_id_seq"'::regclass);


--
-- Name: TemplateItems id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TemplateItems" ALTER COLUMN id SET DEFAULT nextval('public."TemplateItems_id_seq"'::regclass);


--
-- Data for Name: AbsenceRecords; Type: TABLE DATA; Schema: public; Owner: -
--
