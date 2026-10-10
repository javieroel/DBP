-- Esquema de las tablas incidents y users (generado con pg_dump después de aplicar las migraciones)
-- Base: PostgreSQL 16 | Proyecto DBP - Unidades 5 y 6

\restrict NyQzZZ3sJ3rha6k4pcOSc25J8ps2Zljs287LX3AhLd7a9Cxlg3UQet21G7kPj5c

CREATE TABLE public.incidents (
    id integer NOT NULL,
    title character varying(120) NOT NULL,
    description text NOT NULL,
    category character varying(20) NOT NULL,
    priority character varying(10) NOT NULL,
    status character varying(10) DEFAULT 'open'::character varying NOT NULL,
    date date NOT NULL,
    reporter character varying(120) NOT NULL,
    area character varying(80) DEFAULT 'Sin asignar'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_incidents_category CHECK (((category)::text = ANY ((ARRAY['acceso'::character varying, 'sistema'::character varying, 'red'::character varying, 'otro'::character varying])::text[]))),
    CONSTRAINT chk_incidents_desc CHECK ((char_length(description) >= 20)),
    CONSTRAINT chk_incidents_priority CHECK (((priority)::text = ANY ((ARRAY['alta'::character varying, 'media'::character varying, 'baja'::character varying])::text[]))),
    CONSTRAINT chk_incidents_status CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'progress'::character varying, 'closed'::character varying])::text[]))),
    CONSTRAINT chk_incidents_title CHECK ((char_length((title)::text) >= 5))
);

CREATE SEQUENCE public.incidents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.incidents_id_seq OWNED BY public.incidents.id;

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(80) NOT NULL,
    email character varying(120) NOT NULL,
    password_hash character varying(100) NOT NULL,
    role character varying(15) DEFAULT 'lector'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_users_hash CHECK (((password_hash)::text ~~ '$2%'::text)),
    CONSTRAINT chk_users_role CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'analista'::character varying, 'lector'::character varying])::text[])))
);

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

ALTER TABLE ONLY public.incidents ALTER COLUMN id SET DEFAULT nextval('public.incidents_id_seq'::regclass);

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

CREATE INDEX idx_incidents_date ON public.incidents USING btree (date);

CREATE INDEX idx_incidents_priority ON public.incidents USING btree (priority);

CREATE INDEX idx_incidents_status ON public.incidents USING btree (status);

\unrestrict NyQzZZ3sJ3rha6k4pcOSc25J8ps2Zljs287LX3AhLd7a9Cxlg3UQet21G7kPj5c

