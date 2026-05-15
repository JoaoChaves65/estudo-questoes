CREATE TABLE "study_disciplines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"external_id" varchar(64) NOT NULL,
	"name" varchar(512) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discipline_id" uuid NOT NULL,
	"external_id" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_desempenho" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"data" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_srs_progress" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "study_disciplines" ADD CONSTRAINT "study_disciplines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_questions" ADD CONSTRAINT "study_questions_discipline_id_study_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."study_disciplines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_desempenho" ADD CONSTRAINT "user_desempenho_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_srs_progress" ADD CONSTRAINT "user_srs_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "study_disciplines_user_ext_uq" ON "study_disciplines" USING btree ("user_id","external_id");--> statement-breakpoint
CREATE INDEX "study_disciplines_user_id_idx" ON "study_disciplines" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "study_questions_disc_ext_uq" ON "study_questions" USING btree ("discipline_id","external_id");--> statement-breakpoint
CREATE INDEX "study_questions_discipline_id_idx" ON "study_questions" USING btree ("discipline_id");