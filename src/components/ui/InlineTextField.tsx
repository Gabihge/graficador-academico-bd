import { useEffect, useId, useRef, useState } from "react";
import { textInput } from "@/components/ui/buttonStyles";

interface InlineTextFieldProps {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * Campo de texto que confirma el cambio al perder foco o al presionar Enter,
 * no en cada tecla. Asi cada edicion de nombre es UNA entrada de undo, no una
 * por caracter. Se re-siembra si `value` cambia desde afuera.
 */
export function InlineTextField({
  label,
  value,
  onCommit,
  placeholder,
  autoFocus,
}: InlineTextFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const lastExternal = useRef(value);

  useEffect(() => {
    if (value !== lastExternal.current) {
      lastExternal.current = value;
      setDraft(value);
    }
  }, [value]);

  const commit = () => {
    const next = draft.trim();
    if (next.length === 0 || next === value) {
      setDraft(value);
      return;
    }
    lastExternal.current = next;
    onCommit(next);
  };

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-600">{label}</span>
      <input
        id={id}
        className={textInput}
        value={draft}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            setDraft(value);
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}
