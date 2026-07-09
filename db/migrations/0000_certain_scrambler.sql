CREATE TABLE "draws" (
	"draw_num" text PRIMARY KEY NOT NULL,
	"draw_time" date NOT NULL,
	"draw_result" text NOT NULL,
	"d1" smallint NOT NULL,
	"d2" smallint NOT NULL,
	"d3" smallint NOT NULL,
	"d4" smallint NOT NULL,
	"d5" smallint NOT NULL,
	"total_sale_amount" numeric(18, 2),
	"pool_balance_after_draw" numeric(18, 2),
	"draw_flow_fund" numeric(18, 2),
	"stake_count" integer,
	"total_prize_amount" numeric(18, 2)
);
--> statement-breakpoint
CREATE INDEX "draws_draw_time_idx" ON "draws" USING btree ("draw_time");