import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'

const CONTROLE =
  'w-full rounded-md border border-linha bg-folha px-3 py-2.5 text-sm text-tinta placeholder:text-tinta/40 focus:border-tinta disabled:bg-papel'

interface FieldProps {
  id?: string
  label: string
  dica?: string
  erro?: string
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; className: string }) => ReactNode
}

/** Associa label, dica e erro ao controle (acessibilidade sem repetição em cada tela). */
export function Field({ id: idExterno, label, dica, erro, children }: FieldProps) {
  const idGerado = useId()
  const id = idExterno ?? idGerado
  const descricaoId = dica || erro ? `${id}-desc` : undefined
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        'aria-describedby': descricaoId,
        'aria-invalid': erro ? true : undefined,
        className: clsx(CONTROLE, erro && 'border-caneta'),
      })}
      {(dica || erro) && (
        <p id={descricaoId} className={clsx('mt-1.5 text-xs', erro ? 'text-caneta' : 'text-tinta/70')}>
          {erro ?? dica}
        </p>
      )}
    </div>
  )
}

type CampoBase = { id?: string; label: string; dica?: string; erro?: string }

export function TextField({ id, label, dica, erro, ...rest }: CampoBase & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field id={id} label={label} dica={dica} erro={erro}>
      {(p) => <input {...rest} {...p} className={clsx(p.className, rest.className)} />}
    </Field>
  )
}

export function SelectField({
  id,
  label,
  dica,
  erro,
  children,
  ...rest
}: CampoBase & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field id={id} label={label} dica={dica} erro={erro}>
      {(p) => (
        <select {...rest} {...p}>
          {children}
        </select>
      )}
    </Field>
  )
}

export function TextAreaField({ id, label, dica, erro, ...rest }: CampoBase & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field id={id} label={label} dica={dica} erro={erro}>
      {(p) => <textarea {...rest} {...p} />}
    </Field>
  )
}
