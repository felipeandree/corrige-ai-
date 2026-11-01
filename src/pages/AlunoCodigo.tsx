import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'

const CODIGO = /^[A-Z]{5}$/

export default function AlunoCodigo() {
  const navegar = useNavigate()
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string>()

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    if (!CODIGO.test(codigo)) {
      setErro('O código tem 5 letras, sem números. Confira com o professor.')
      return
    }
    navegar(`/aluno/${codigo}`)
  }

  return (
    <div className="mx-auto max-w-md py-4">
      <h1 className="text-3xl font-bold">Qual é o código da prova?</h1>
      <p className="mt-2 text-tinta/70">Seu professor passa um código de 5 letras. Digite abaixo para abrir o cartão-resposta.</p>

      <form onSubmit={aoEnviar} className="mt-8 space-y-4">
        <Field label="Código da prova" erro={erro}>
          {(p) => (
            <input
              {...p}
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5))
                setErro(undefined)
              }}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={5}
              placeholder="KTXWZ"
              className={`${p.className} text-center font-display text-3xl font-extrabold uppercase tracking-[0.35em] placeholder:tracking-[0.35em]`}
            />
          )}
        </Field>
        <Button type="submit" className="w-full py-3">
          Abrir prova
        </Button>
      </form>
    </div>
  )
}
