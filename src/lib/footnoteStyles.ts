/** Shared by the viewer, sandboxed template previews and standalone HTML exports. */
export const FOOTNOTE_STYLES = `
section.footnotes[data-footnotes] {
  margin-top: 2em;
  font-size: .875em;
  line-height: 1.6;
}
section.footnotes[data-footnotes]::before {
  content: "";
  display: block;
  width: min(25%, 16rem);
  height: 1px;
  margin-bottom: 1.25em;
  background: #9ca3af;
}
section.footnotes[data-footnotes] > .ld-footnotes-label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
section.footnotes[data-footnotes] > ol > li::marker {
  content: "(" counter(list-item) ") ";
}
.ld-tag-marker {
  background: #fde047;
  color: #713f12;
  font-size: .75em;
  font-weight: 600;
  padding: 0 .3em;
  border-radius: .2em;
  cursor: help;
  vertical-align: .1em;
}
`;
