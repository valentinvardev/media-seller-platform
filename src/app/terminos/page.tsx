import Link from "next/link";
import Image from "next/image";
import { MobileNav } from "~/app/_components/MobileNav";

export const metadata = {
  title: "Condiciones de Servicio — ALTAFOTO",
  description: "Términos y condiciones de uso de la plataforma ALTAFOTO.",
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* NAV */}
      <nav className="sticky top-0 z-50 shadow-md" style={{ background: "#0057A8" }}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="md:hidden flex items-center shrink-0">
            <Image src="/logo.png" alt="ALTAFOTO" width={180} height={52} className="h-11 w-auto brightness-0 invert" priority />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="font-display font-600 uppercase tracking-wider text-base text-white/90 hover:text-white transition-colors">Inicio</Link>
            <Link href="/#eventos" className="font-display font-600 uppercase tracking-wider text-base text-white/90 hover:text-white transition-colors">Eventos</Link>
            <Link href="/#contacto" className="font-display font-600 uppercase tracking-wider text-base text-white/90 hover:text-white transition-colors">Contacto</Link>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <Link href="/#eventos" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black text-white transition-all hover:scale-105" style={{ background: "#F97316" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Mis fotos
            </Link>
            <MobileNav />
          </div>
        </div>
        <div className="h-0.5 w-full" style={{ background: "#F97316" }} />
      </nav>

      {/* CONTENT */}
      <main className="max-w-3xl mx-auto px-5 py-14">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link href="/" className="hover:text-gray-600 transition-colors">Inicio</Link>
          <span>/</span>
          <span className="text-gray-700">Condiciones de Servicio</span>
        </nav>

        <h1 className="font-display font-900 uppercase text-gray-900 mb-2" style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)" }}>
          Condiciones de Servicio
        </h1>
        <p className="text-gray-400 text-sm mb-10">Última actualización: abril de 2025</p>

        <div className="prose prose-gray max-w-none space-y-10 text-gray-700 leading-relaxed">

          <Section title="1. Aceptación de las condiciones">
            <p>
              Al acceder y utilizar la plataforma ALTAFOTO (en adelante, "el Servicio"), operada por ALTAFOTO
              (en adelante, "la Empresa"), usted acepta quedar vinculado por las presentes Condiciones de
              Servicio. Si no está de acuerdo con alguna de estas condiciones, le solicitamos que no utilice
              el Servicio.
            </p>
            <p>
              El uso del Servicio implica la aceptación plena de estas condiciones, así como de la{" "}
              <Link href="/privacidad" className="text-blue-600 hover:underline">Política de Privacidad</Link>{" "}
              vigente.
            </p>
          </Section>

          <Section title="2. Descripción del Servicio">
            <p>
              ALTAFOTO es una plataforma de fotografía deportiva profesional que permite a los usuarios:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Buscar y visualizar fotografías tomadas en eventos deportivos.</li>
              <li>Adquirir fotografías digitales de alta resolución.</li>
              <li>Utilizar tecnología de reconocimiento facial para encontrar fotografías propias.</li>
              <li>Descargar las fotografías adquiridas en formato digital.</li>
            </ul>
            <p>
              Las fotografías se adquieren mediante pago electrónico procesado por MercadoPago. Una vez
              confirmado el pago, el usuario recibe acceso de descarga a las fotografías seleccionadas.
            </p>
          </Section>

          <Section title="3. Registro y cuenta de usuario">
            <p>
              Algunas funciones del Servicio pueden requerir la creación de una cuenta. El usuario es
              responsable de mantener la confidencialidad de sus credenciales y de toda actividad que
              ocurra bajo su cuenta. La Empresa no será responsable por pérdidas derivadas del uso no
              autorizado de su cuenta.
            </p>
            <p>
              El usuario se compromete a proporcionar información veraz y actualizada al momento del
              registro.
            </p>
          </Section>

          <Section title="4. Propiedad intelectual y licencia de uso">
            <p>
              Todas las fotografías disponibles en la plataforma son propiedad exclusiva de ALTAFOTO o de
              los fotógrafos que las producen, y están protegidas por la{" "}
              <strong>Ley 11.723 de Propiedad Intelectual</strong> de la República Argentina.
            </p>
            <p>
              Al adquirir una fotografía, el usuario obtiene una <strong>licencia personal, no exclusiva e
              intransferible</strong> que le permite:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Imprimir y enmarcar la fotografía para uso personal.</li>
              <li>Compartirla en redes sociales personales, con crédito a ALTAFOTO.</li>
              <li>Almacenarla en sus dispositivos personales.</li>
            </ul>
            <p>Queda expresamente <strong>prohibido</strong>:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Revender, sublicenciar o distribuir comercialmente las fotografías.</li>
              <li>Modificar, editar o eliminar marcas de agua sin autorización expresa.</li>
              <li>Utilizar las fotografías con fines publicitarios o comerciales sin acuerdo previo escrito.</li>
            </ul>
          </Section>

          <Section title="5. Precios y pagos">
            <p>
              Los precios de las fotografías son los indicados en la plataforma al momento de la compra y
              se expresan en <strong>pesos argentinos (ARS)</strong>, salvo indicación en contrario. Los
              precios incluyen el Impuesto al Valor Agregado (IVA) cuando corresponda.
            </p>
            <p>
              Los pagos se procesan exclusivamente a través de <strong>MercadoPago</strong>. ALTAFOTO no
              almacena datos de tarjetas de crédito ni débito. El procesamiento de pagos está sujeto a los
              términos y condiciones de MercadoPago.
            </p>
            <p>
              La Empresa se reserva el derecho de modificar los precios en cualquier momento, sin que ello
              afecte las compras ya realizadas y confirmadas.
            </p>
          </Section>

          <Section title="6. Política de reembolsos y devoluciones">
            <p>
              En virtud de la naturaleza digital de los productos, una vez que el usuario ha descargado la
              fotografía adquirida, no procederá la devolución del importe, salvo en los siguientes casos:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Error técnico imputable a la plataforma que impida la descarga.</li>
              <li>Entrega de un archivo diferente al adquirido.</li>
              <li>Defecto grave de calidad no atribuible a las condiciones de captura.</li>
            </ul>
            <p>
              Las solicitudes de reembolso deberán realizarse dentro de los{" "}
              <strong>10 días corridos</strong> posteriores a la compra, enviando un correo a{" "}
              <a href="mailto:hola@fotodeporte.com.ar" className="text-blue-600 hover:underline">hola@fotodeporte.com.ar</a>{" "}
              con el comprobante de pago.
            </p>
            <p className="text-sm text-gray-500">
              De conformidad con el artículo 34 de la <strong>Ley 24.240 de Defensa del Consumidor</strong> y
              sus modificaciones, el usuario tiene derecho a revocar la aceptación durante el plazo de DIEZ
              (10) días corridos contados desde la fecha en que se celebró el contrato o desde que se pone en
              posesión del bien, lo que ocurra último, cuando el contrato se hubiere celebrado fuera del
              establecimiento comercial, incluyendo la modalidad electrónica o por correspondencia.
            </p>
          </Section>

          <Section title="7. Reconocimiento facial">
            <p>
              La plataforma ofrece de manera opcional la posibilidad de buscar fotografías mediante el
              reconocimiento facial a partir de una imagen (selfie) aportada voluntariamente por el usuario.
              Esta funcionalidad:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Es de uso estrictamente <strong>voluntario</strong>.</li>
              <li>Procesa la imagen únicamente para la búsqueda solicitada, sin almacenar el rostro del usuario.</li>
              <li>Utiliza servicios de Amazon Web Services (AWS Rekognition) bajo las condiciones de privacidad de dicho proveedor.</li>
            </ul>
            <p>
              Al utilizar esta función, el usuario consiente expresamente el procesamiento temporal de su
              imagen para la búsqueda. Consulte nuestra{" "}
              <Link href="/privacidad" className="text-blue-600 hover:underline">Política de Privacidad</Link>{" "}
              para mayor detalle.
            </p>
          </Section>

          <Section title="8. Conducta del usuario">
            <p>El usuario se compromete a no utilizar el Servicio para:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Actividades ilegales o contrarias a la moral y las buenas costumbres.</li>
              <li>Intentar acceder sin autorización a sistemas, datos o cuentas ajenas.</li>
              <li>Distribuir malware, spam u otro contenido dañino.</li>
              <li>Vulnerar derechos de terceros, incluyendo derechos de imagen y privacidad.</li>
            </ul>
          </Section>

          <Section title="9. Limitación de responsabilidad">
            <p>
              La Empresa no será responsable por daños indirectos, incidentales, especiales o consecuentes
              derivados del uso o la imposibilidad de uso del Servicio, incluidos, sin limitación, pérdida
              de datos o lucro cesante.
            </p>
            <p>
              Las fotografías se entregan en el estado en que fueron capturadas. La Empresa no garantiza
              que todas las fotografías de un evento estarán disponibles ni que el usuario aparezca en
              alguna de ellas.
            </p>
          </Section>

          <Section title="10. Modificaciones del servicio y las condiciones">
            <p>
              La Empresa se reserva el derecho de modificar, suspender o discontinuar el Servicio en
              cualquier momento, con o sin previo aviso. Asimismo, podrá actualizar estas Condiciones
              periódicamente. El uso continuado del Servicio tras la publicación de cambios implica la
              aceptación de las nuevas condiciones.
            </p>
          </Section>

          <Section title="11. Ley aplicable y jurisdicción">
            <p>
              Las presentes Condiciones se rigen por las leyes de la <strong>República Argentina</strong>.
              Cualquier controversia será sometida a la jurisdicción de los Tribunales Ordinarios de la
              Ciudad Autónoma de Buenos Aires, renunciando expresamente a cualquier otro fuero que pudiera
              corresponder.
            </p>
            <p>
              Son de aplicación, entre otras, la <strong>Ley 24.240 de Defensa del Consumidor</strong>,
              la <strong>Ley 25.326 de Protección de los Datos Personales</strong> y la{" "}
              <strong>Ley 11.723 de Propiedad Intelectual</strong>.
            </p>
          </Section>

          <Section title="12. Contacto">
            <p>
              Para consultas relacionadas con estas Condiciones, puede comunicarse con nosotros en:{" "}
              <a href="mailto:hola@fotodeporte.com.ar" className="text-blue-600 hover:underline">
                hola@fotodeporte.com.ar
              </a>
            </p>
          </Section>

        </div>

        {/* Footer link */}
        <div className="mt-14 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link href="/privacidad" className="text-blue-600 text-sm hover:underline">
            Ver Política de Privacidad →
          </Link>
          <Link href="/" className="text-gray-400 text-sm hover:text-gray-600 transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </main>

      {/* FOOTER */}
      <footer style={{ background: "#001A4D" }} className="py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-blue-500 text-xs">© {new Date().getFullYear()} ALTAFOTO. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/terminos" className="text-blue-400 text-xs hover:text-white transition-colors">Términos</Link>
            <Link href="/privacidad" className="text-blue-600 text-xs hover:text-blue-400 transition-colors">Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display font-800 text-gray-900 text-lg mb-3 pb-2 border-b border-gray-100">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
