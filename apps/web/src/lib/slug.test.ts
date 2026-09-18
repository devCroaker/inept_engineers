import { describe, expect, it } from "vitest";

import { slugProblem, slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and joins words", () => {
    expect(slugify("Autumn War")).toBe("autumn-war");
  });

  it("strips accents rather than dropping the letters", () => {
    expect(slugify("Crème Brûlée Night")).toBe("creme-brulee-night");
  });

  it("collapses punctuation and runs of separators", () => {
    expect(slugify("Twelfth Night: Feast & Revel!")).toBe(
      "twelfth-night-feast-revel",
    );
  });

  it("does not leave a leading or trailing hyphen", () => {
    expect(slugify("  ...Practice...  ")).toBe("practice");
  });

  it("gives an empty string when there is nothing usable", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("slugProblem", () => {
  it("accepts a well formed slug", () => {
    expect(slugProblem("autumn-war")).toBeUndefined();
  });

  it("rejects an empty one", () => {
    expect(slugProblem("")).toBeDefined();
  });

  it("rejects capitals, spaces, and doubled hyphens", () => {
    expect(slugProblem("Autumn War")).toBeDefined();
    expect(slugProblem("autumn--war")).toBeDefined();
    expect(slugProblem("-autumn")).toBeDefined();
  });

  it("rejects slugs the site's own pages already use", () => {
    // /events/new is the create page, so an event called "new" could never be
    // opened: Next matches the static segment before the dynamic one.
    expect(slugProblem("new")).toBeDefined();
    expect(slugProblem("edit")).toBeDefined();
  });
});
