-- AlterTable
ALTER TABLE "Paper" ADD COLUMN     "searchVector" tsvector;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "searchVector" tsvector;

-- Full-text search: GIN indexes for fast tsquery lookups.
CREATE INDEX "Question_searchVector_idx" ON "Question" USING GIN ("searchVector");
CREATE INDEX "Paper_searchVector_idx" ON "Paper" USING GIN ("searchVector");

-- Function + triggers keep search_vector fresh on insert/update.
CREATE OR REPLACE FUNCTION "Question_search_vector_update"() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.body, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "Paper_search_vector_update"() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" := setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Question_search_vector_trigger"
  BEFORE INSERT OR UPDATE OF title, body ON "Question"
  FOR EACH ROW EXECUTE FUNCTION "Question_search_vector_update"();

CREATE TRIGGER "Paper_search_vector_trigger"
  BEFORE INSERT OR UPDATE OF title ON "Paper"
  FOR EACH ROW EXECUTE FUNCTION "Paper_search_vector_update"();

-- Backfill existing rows.
UPDATE "Question" SET "searchVector" =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(body, '')), 'B');
UPDATE "Paper" SET "searchVector" =
  setweight(to_tsvector('english', coalesce(title, '')), 'A');
