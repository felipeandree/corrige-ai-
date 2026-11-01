import { ButtonLink } from '@/components/ui/Button'

export default function NaoEncontrada() {
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <h1 className="text-3xl font-bold">Página não encontrada</h1>
      <p className="mt-3 text-tinta/70">O endereço que você abriu não existe ou foi movido.</p>
      <ButtonLink to="/" className="mt-6">
        Voltar ao início
      </ButtonLink>
    </div>
  )
}
