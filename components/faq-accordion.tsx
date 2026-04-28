"use client";

import { useMemo, useRef, useState } from "react";

import type { FaqItem } from "@/lib/faq-content";

function slugifyCategory(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function FaqAccordion({
  groups,
}: {
  groups: Array<{
    category: string;
    items: FaqItem[];
  }>;
}) {
  const entries = useMemo(
    () =>
      groups.flatMap((group) =>
        group.items.map((item, index) => ({
          key: `${group.category}-${index}`,
          category: group.category,
          item,
        })),
      ),
    [groups],
  );
  const [openKey, setOpenKey] = useState<string | null>(entries[0]?.key ?? null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (entries.length === 0) {
      return;
    }

    let targetIndex = index;

    switch (event.key) {
      case "ArrowDown":
        targetIndex = (index + 1) % entries.length;
        break;
      case "ArrowUp":
        targetIndex = (index - 1 + entries.length) % entries.length;
        break;
      case "Home":
        targetIndex = 0;
        break;
      case "End":
        targetIndex = entries.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    buttonRefs.current[targetIndex]?.focus();
  }

  return (
    <div className="faq-groups">
      {groups.map((group) => (
        <section
          key={group.category}
          className="panel panel--glass faq-section"
          aria-labelledby={`faq-${slugifyCategory(group.category)}`}
        >
          <div className="panel__header">
            <div>
              <p className="eyebrow">FAQ category</p>
              <h2 id={`faq-${slugifyCategory(group.category)}`}>{group.category}</h2>
            </div>
            <span className="badge">{group.items.length} questions</span>
          </div>
          <div className="faq-list">
            {group.items.map((item, index) => {
              const entryIndex = entries.findIndex((entry) => entry.category === group.category && entry.item.question === item.question);
              const entry = entries[entryIndex];
              const isOpen = openKey === entry.key;
              const buttonId = `faq-button-${entry.key}`;
              const panelId = `faq-panel-${entry.key}`;

              return (
                <article key={entry.key} className={`faq-item${isOpen ? " faq-item--open" : ""}`}>
                  <button
                    ref={(node) => {
                      buttonRefs.current[entryIndex] = node;
                    }}
                    id={buttonId}
                    className="faq-item__trigger"
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenKey(isOpen ? null : entry.key)}
                    onKeyDown={(event) => handleKeyDown(event, entryIndex)}
                  >
                    <span className="badge badge--pink">{group.category}</span>
                    <strong>{item.question}</strong>
                    <span aria-hidden="true" className="faq-item__chevron">
                      {isOpen ? "▴" : "▾"}
                    </span>
                  </button>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    hidden={!isOpen}
                    className="faq-item__panel"
                  >
                    <p>{item.answer}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
