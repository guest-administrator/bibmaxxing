/* =========================================================================
   Provenance row — compact badge strip showing where a question comes from.

   Rendered after the explanation in flashcards reveal, quiz answer-feedback,
   and exam review-items. Each badge has a title attribute for hover detail
   so the card stays compact.

   Badges shown when relevant:
     - section code (always, if a primarySection is set)
     - objective short label (always, if a primaryObjective is set)
     - sourceRef id (always, if set)
     - sourceConfidence tier (only when it's not the default "source-verified")
     - sourceSectionConfidence tier (only when low or manual-needed)
     - examScope tag (only when not "regular")
   ========================================================================= */

const CONFIDENCE_LABEL = {
  "source-verified":    { text: "verified",                  cls: "prov-source-verified" },
  "public-adjacent":    { text: "public-adjacent x0.8",       cls: "prov-public-adjacent" },
  "restricted-summary": { text: "restricted-summary x0.5",    cls: "prov-restricted-summary" },
  "remove-or-rewrite":  { text: "remove-or-rewrite x0",       cls: "prov-remove-or-rewrite" },
};

const SECTION_TITLE = "Section (exam weight). Click into the dashboard's Section readiness panel for the per-section breakdown.";
const OBJECTIVE_TITLE = "Study objective. Drilling weak objectives is the fastest path to weighted readiness.";
const REF_TITLE = "Source reference. The Bib citation this question pulls from.";
const ANCHOR_LOW_TITLE = "Source-section anchor confidence is low. \"View source\" may land near the relevant heading, not exactly on it. See Manage > Data health for the review queue.";
const SCOPE_TITLE_SUB = "Substitute-exam scope. This question is excluded from regular-exam readiness math.";
const SCOPE_TITLE_OTHER = "Non-regular exam scope.";

function badge(text, { cls = "", title = "" } = {}) {
  const el = document.createElement("span");
  el.className = "provenance-badge" + (cls ? " " + cls : "");
  if (title) el.title = title;
  el.textContent = text;
  return el;
}

/**
 * Build a compact provenance row for a question.
 *
 *   renderProvenance(q, bibData) -> HTMLDivElement | null
 *
 * Returns null when the question has nothing worth showing (no metadata).
 */
export function renderProvenance(q, bibData) {
  if (!q) return null;
  const row = document.createElement("div");
  row.className = "provenance-row";
  let added = 0;

  const section = bibData?.sections?.find?.((s) => s.id === q.primarySection);
  if (section) {
    row.appendChild(badge(section.code || section.id, {
      cls: "prov-section",
      title: `${SECTION_TITLE} (${section.name})`,
    }));
    added++;
  }

  const objective = bibData?.objectives?.find?.((o) => o.id === q.primaryObjective);
  if (objective) {
    // Trim long objective names to keep the row compact.
    const label = (objective.name || objective.id).length > 36
      ? (objective.name || objective.id).slice(0, 33) + "..."
      : (objective.name || objective.id);
    row.appendChild(badge(label, {
      cls: "prov-objective",
      title: `${OBJECTIVE_TITLE} (${objective.name || objective.id})`,
    }));
    added++;
  }

  if (q.sourceRef) {
    row.appendChild(badge(q.sourceRef, {
      cls: "prov-ref",
      title: REF_TITLE,
    }));
    added++;
  }

  // Only show sourceConfidence when it's not the default; default ("source-verified" or unset) means full weight in readiness.
  if (q.sourceConfidence && q.sourceConfidence !== "source-verified") {
    const meta = CONFIDENCE_LABEL[q.sourceConfidence] || { text: q.sourceConfidence, cls: "prov-confidence-other" };
    row.appendChild(badge(meta.text, {
      cls: "prov-confidence " + meta.cls,
      title: "Source confidence — this question's contribution to readiness is scaled by the factor shown.",
    }));
    added++;
  }

  if (q.sourceSectionConfidence === "low" || q.sourceSectionConfidence === "manual-needed") {
    row.appendChild(badge("imprecise anchor", {
      cls: "prov-anchor-low",
      title: ANCHOR_LOW_TITLE,
    }));
    added++;
  }

  const sourceRefEntry = bibData?.references?.find?.((r) => r.id === q.sourceRef);
  if (sourceRefEntry?.examScope && sourceRefEntry.examScope !== "regular") {
    row.appendChild(badge(sourceRefEntry.examScope, {
      cls: "prov-exam-scope",
      title: sourceRefEntry.examScope === "substitute" ? SCOPE_TITLE_SUB : SCOPE_TITLE_OTHER,
    }));
    added++;
  }

  return added > 0 ? row : null;
}
