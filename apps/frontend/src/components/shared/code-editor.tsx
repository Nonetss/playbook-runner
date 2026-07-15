import { python } from "@codemirror/lang-python"
import { yaml } from "@codemirror/lang-yaml"
import { StreamLanguage } from "@codemirror/language"
import { shell } from "@codemirror/legacy-modes/mode/shell"
import { Compartment, EditorState, type Extension } from "@codemirror/state"
import { oneDark } from "@codemirror/theme-one-dark"
import { placeholder as placeholderExtension } from "@codemirror/view"
import { basicSetup, EditorView } from "codemirror"
import * as React from "react"
import { useTheme } from "@/components/features/global/hooks/use-theme"
import { cn } from "@/lib/utils"

export type CodeEditorLanguage = "bash" | "python" | "yaml"

const LANGUAGE_EXTENSIONS: Record<CodeEditorLanguage, Extension> = {
  bash: StreamLanguage.define(shell),
  python: python(),
  yaml: yaml(),
}

const TERMINAL_FONT_STACK =
  'ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace'

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    maxHeight: "100%",
    backgroundColor: "transparent",
    color: "var(--foreground)",
    fontSize: "0.75rem",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-scroller": {
    height: "100%",
    overflow: "auto !important",
    overscrollBehavior: "contain",
    fontFamily: TERMINAL_FONT_STACK,
    lineHeight: "1.625",
  },
  ".cm-content": {
    padding: "0.5rem 0",
    caretColor: "var(--foreground)",
  },
  ".cm-line": {
    padding: "0 0.75rem",
  },
  ".cm-gutters": {
    backgroundColor: "color-mix(in oklch, var(--muted) 45%, transparent)",
    color: "var(--muted-foreground)",
    borderRight: "1px solid var(--border)",
  },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "color-mix(in oklch, var(--accent) 55%, transparent)",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--foreground)",
  },
  ".cm-placeholder": {
    color: "var(--muted-foreground)",
  },
  "&.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in oklch, var(--primary) 28%, transparent)",
  },
})

export type CodeEditorProps = {
  id?: string
  value: string
  language: CodeEditorLanguage
  placeholder?: string
  disabled?: boolean
  required?: boolean
  ariaInvalid?: boolean
  ariaLabelledBy?: string
  onChange: (value: string) => void
  onBlur?: () => void
  className?: string
}

export function CodeEditor({
  id,
  value,
  language,
  placeholder = "",
  disabled = false,
  required = false,
  ariaInvalid = false,
  ariaLabelledBy,
  onChange,
  onBlur,
  className,
}: CodeEditorProps) {
  const { theme } = useTheme()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const viewRef = React.useRef<EditorView>(null)
  const onChangeRef = React.useRef(onChange)
  const onBlurRef = React.useRef(onBlur)
  const languageCompartment = React.useRef(new Compartment())
  const themeCompartment = React.useRef(new Compartment())
  const editableCompartment = React.useRef(new Compartment())
  const placeholderCompartment = React.useRef(new Compartment())
  const attributesCompartment = React.useRef(new Compartment())

  onChangeRef.current = onChange
  onBlurRef.current = onBlur

  // CodeMirror owns this DOM subtree; changing props are applied through
  // compartments instead of recreating the editor and losing its selection.
  React.useEffect(() => {
    if (!containerRef.current) return

    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          EditorView.lineWrapping,
          languageCompartment.current.of(LANGUAGE_EXTENSIONS[language]),
          themeCompartment.current.of(
            theme === "dark" ? [oneDark, editorTheme] : editorTheme
          ),
          editableCompartment.current.of([
            EditorState.readOnly.of(disabled),
            EditorView.editable.of(!disabled),
          ]),
          placeholderCompartment.current.of(placeholderExtension(placeholder)),
          attributesCompartment.current.of(
            EditorView.contentAttributes.of({
              ...(id ? { id } : {}),
              ...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : {}),
              "aria-invalid": String(ariaInvalid),
              "aria-required": String(required),
              spellcheck: "false",
            })
          ),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString())
            }
          }),
          EditorView.domEventHandlers({
            blur: () => {
              onBlurRef.current?.()
            },
          }),
        ],
      }),
    })

    viewRef.current = view

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        view.requestMeasure()
      })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      view.destroy()
      viewRef.current = null
    }
  }, [])

  React.useEffect(() => {
    const view = viewRef.current
    if (!view || view.state.doc.toString() === value) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    })
    view.requestMeasure()
  }, [value])

  React.useEffect(() => {
    viewRef.current?.dispatch({
      effects: languageCompartment.current.reconfigure(
        LANGUAGE_EXTENSIONS[language]
      ),
    })
  }, [language])

  React.useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeCompartment.current.reconfigure(
        theme === "dark" ? [oneDark, editorTheme] : editorTheme
      ),
    })
  }, [theme])

  React.useEffect(() => {
    viewRef.current?.dispatch({
      effects: editableCompartment.current.reconfigure([
        EditorState.readOnly.of(disabled),
        EditorView.editable.of(!disabled),
      ]),
    })
  }, [disabled])

  React.useEffect(() => {
    viewRef.current?.dispatch({
      effects: placeholderCompartment.current.reconfigure(
        placeholderExtension(placeholder)
      ),
    })
  }, [placeholder])

  React.useEffect(() => {
    viewRef.current?.dispatch({
      effects: attributesCompartment.current.reconfigure(
        EditorView.contentAttributes.of({
          ...(id ? { id } : {}),
          ...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : {}),
          "aria-invalid": String(ariaInvalid),
          "aria-required": String(required),
          spellcheck: "false",
        })
      ),
    })
  }, [ariaInvalid, ariaLabelledBy, id, required])

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full min-h-48 w-full min-w-0 flex-col overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30",
        disabled && "cursor-not-allowed opacity-50",
        ariaInvalid &&
          "border-destructive ring-destructive/20 dark:ring-destructive/40",
        className
      )}
    />
  )
}
