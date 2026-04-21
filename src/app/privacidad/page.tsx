import Link from "next/link";
import Image from "next/image";
import { MobileNav } from "~/app/_components/MobileNav";

export const metadata = {
  title: "Política de Privacidad — ALTAFOTO",
  description: "Política de privacidad y tratamiento de datos personales de ALTAFOTO, conforme a la Ley 25.326.",
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* NAV */}
      <nav className="sticky top-0 z-50 shadow-md" style={{ background: "#0057A8" }}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="md:hidden flex items-center shrink-0">
            <Image src="/logo.png" alt="ALTAFOTO" width={180} height={52} className="h-11 w-auto" priority />
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
          <span className="text-gray-700">Política de Privacidad</span>
        </nav>

        <h1 className="font-display font-900 uppercase text-gray-900 mb-2" style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)" }}>
          Política de Privacidad
        </h1>
        <p className="text-gray-400 text-sm mb-2">Última actualización: abril de 2025</p>
        <p className="text-sm text-gray-500 mb-10 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          Esta política se rige por la <strong>Ley 25.326 de Protección de los Datos Personales</strong> de
          la República Argentina y sus normas complementarias dictadas por la Agencia de Acceso a la
          Información Pública (AAIP).
        </p>

        <div className="space-y-10 text-gray-700 leading-relaxed">

          <Section title="1. Responsable del tratamiento">
            <p>
              El responsable del tratamiento de los datos personales recolectados a través de esta
              plataforma es <strong>ALTAFOTO</strong>, con domicilio en la República Argentina.
            </p>
            <p>
              Contacto para asuntos de privacidad:{" "}
              <a href="mailto:hola@fotodeporte.com.ar" className="text-blue-600 hover:underline">
                hola@fotodeporte.com.ar
              </a>
            </p>
          </Section>

          <Section title="2. Datos que recolectamos">
            <p>Recolectamos los siguientes datos según la interacción del usuario con el Servicio:</p>

            <SubSection title="2.1 Datos proporcionados directamente">
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li><strong>Correo electrónico</strong> — para el acceso a compras y envío del comprobante.</li>
                <li><strong>Datos de pago</strong> — gestionados exclusivamente por MercadoPago; ALTAFOTO no almacena números de tarjeta ni CVV.</li>
              </ul>
            </SubSection>

            <SubSection title="2.2 Datos recolectados automáticamente">
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li><strong>Dirección IP</strong> y datos de navegación (navegador, sistema operativo, páginas visitadas).</li>
                <li><strong>Cookies técnicas</strong> necesarias para el funcionamiento del Servicio (sesión, preferencias).</li>
              </ul>
            </SubSection>

            <SubSection title="2.3 Imágenes para reconocimiento facial (opcional)">
              <p className="text-gray-600">
                Si el usuario elige utilizar la función de búsqueda por selfie, la imagen proporcionada
                se transmite de forma cifrada al servicio <strong>Amazon Rekognition (AWS)</strong> para
                comparación con las fotografías del evento. La imagen <strong>no se almacena</strong> en
                los servidores de ALTAFOTO una vez completada la búsqueda. El uso de esta función es
                completamente voluntario.
              </p>
            </SubSection>
          </Section>

          <Section title="3. Finalidad del tratamiento">
            <p>Los datos recolectados se utilizan exclusivamente para las siguientes finalidades:</p>
            <table className="w-full text-sm border-collapse mt-2">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Dato</th>
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Finalidad</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Correo electrónico", "Envío de comprobante de compra y enlace de descarga"],
                  ["Datos de sesión", "Autenticación y acceso al historial de compras"],
                  ["Datos de pago", "Procesamiento de transacciones (gestionado por MercadoPago)"],
                  ["IP / navegación", "Seguridad, prevención de fraude y mejora del Servicio"],
                  ["Imagen (selfie)", "Búsqueda de fotografías por reconocimiento facial (uso puntual, no almacenada)"],
                ].map(([dato, fin]) => (
                  <tr key={dato} className="even:bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200 text-gray-700">{dato}</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-600">{fin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="4. Base legal del tratamiento">
            <p>El tratamiento de datos se sustenta en las siguientes bases legales:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li><strong>Ejecución de contrato</strong> — para procesar compras y entregar los archivos adquiridos.</li>
              <li><strong>Consentimiento</strong> — para el tratamiento de datos biométricos (imagen facial), que el usuario otorga de forma libre, expresa e informada al utilizar la función de búsqueda por selfie.</li>
              <li><strong>Interés legítimo</strong> — para la seguridad de la plataforma y la prevención de fraude.</li>
              <li><strong>Obligación legal</strong> — cuando así lo requiera la normativa vigente.</li>
            </ul>
          </Section>

          <Section title="5. Datos biométricos y reconocimiento facial">
            <p>
              En virtud del carácter sensible de los datos biométricos conforme al artículo 2 de la
              <strong> Ley 25.326</strong>, ALTAFOTO adopta las siguientes medidas específicas:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-600">
              <li>La imagen facial se transmite cifrada (HTTPS/TLS) directamente al servicio de comparación.</li>
              <li>No se construyen perfiles biométricos permanentes de los usuarios.</li>
              <li>Las colecciones de AWS Rekognition contienen vectores de las fotografías de los eventos, <strong>no de los usuarios</strong>.</li>
              <li>El consentimiento puede retirarse en cualquier momento dejando de usar dicha función.</li>
            </ul>
          </Section>

          <Section title="6. Transferencia de datos a terceros">
            <p>ALTAFOTO puede compartir datos con los siguientes proveedores, exclusivamente en la medida necesaria para prestar el Servicio:</p>
            <table className="w-full text-sm border-collapse mt-2">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Proveedor</th>
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Finalidad</th>
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">País</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["MercadoPago", "Procesamiento de pagos", "Argentina"],
                  ["Amazon Web Services (AWS)", "Almacenamiento de imágenes y reconocimiento facial", "EE. UU. / Brasil"],
                  ["Supabase", "Base de datos y almacenamiento de archivos", "EE. UU."],
                  ["Resend", "Envío de correos transaccionales", "EE. UU."],
                ].map(([prov, fin, pais]) => (
                  <tr key={prov} className="even:bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200 font-medium text-gray-700">{prov}</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-600">{fin}</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-500">{pais}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-sm text-gray-500 mt-3">
              Las transferencias internacionales se realizan bajo cláusulas contractuales estándar o
              hacia países con nivel adecuado de protección. ALTAFOTO no vende ni cede datos personales
              a terceros con fines comerciales.
            </p>
          </Section>

          <Section title="7. Plazo de conservación de datos">
            <p>Los datos se conservan durante los siguientes plazos:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li><strong>Datos de compra y correo electrónico:</strong> 5 años desde la transacción, en cumplimiento de obligaciones contables y fiscales.</li>
              <li><strong>Datos de sesión y navegación:</strong> hasta 12 meses.</li>
              <li><strong>Imagen facial (selfie):</strong> no se almacena; se procesa en tiempo real y se descarta.</li>
            </ul>
          </Section>

          <Section title="8. Derechos del titular de los datos">
            <p>
              Conforme a los artículos 14 a 16 de la <strong>Ley 25.326</strong>, el titular de los datos
              personales tiene derecho a:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li><strong>Acceso:</strong> solicitar información sobre los datos que conservamos.</li>
              <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
              <li><strong>Supresión:</strong> solicitar la eliminación de sus datos cuando no sean necesarios para la finalidad original.</li>
              <li><strong>Confidencialidad:</strong> oponerse al tratamiento en determinadas circunstancias.</li>
            </ul>
            <p>
              Para ejercer cualquiera de estos derechos, envíe una solicitud a{" "}
              <a href="mailto:hola@fotodeporte.com.ar" className="text-blue-600 hover:underline">
                hola@fotodeporte.com.ar
              </a>{" "}
              indicando su nombre, correo electrónico asociado y el derecho que desea ejercer.
              Responderemos dentro de los <strong>30 días hábiles</strong> conforme a la normativa vigente.
            </p>
            <p className="text-sm text-gray-500 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 mt-2">
              <strong>Autoridad de control:</strong> Si considera que el tratamiento de sus datos no se
              ajusta a la normativa, puede presentar una reclamación ante la{" "}
              <strong>Agencia de Acceso a la Información Pública (AAIP)</strong> en{" "}
              <a href="https://www.argentina.gob.ar/aaip" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                www.argentina.gob.ar/aaip
              </a>
            </p>
          </Section>

          <Section title="9. Cookies">
            <p>
              Utilizamos <strong>cookies técnicas y de sesión</strong> estrictamente necesarias para el
              funcionamiento de la plataforma (autenticación y preferencias). No utilizamos cookies de
              seguimiento publicitario ni compartimos datos de navegación con redes de publicidad.
            </p>
            <p>
              Puede configurar su navegador para rechazar cookies, aunque esto puede afectar algunas
              funcionalidades del Servicio.
            </p>
          </Section>

          <Section title="10. Seguridad de la información">
            <p>
              Implementamos medidas técnicas y organizativas razonables para proteger los datos personales
              contra el acceso no autorizado, alteración, divulgación o destrucción, incluyendo:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Comunicaciones cifradas mediante TLS/HTTPS.</li>
              <li>Acceso restringido a los datos según el principio de mínimo privilegio.</li>
              <li>Proveedores de infraestructura certificados (AWS, Supabase).</li>
            </ul>
          </Section>

          <Section title="11. Menores de edad">
            <p>
              El Servicio no está dirigido a menores de <strong>13 años</strong>. Si tomamos conocimiento
              de que hemos recolectado datos de un menor sin el consentimiento de su representante legal,
              procederemos a eliminarlos.
            </p>
          </Section>

          <Section title="12. Modificaciones de esta política">
            <p>
              Podemos actualizar esta Política periódicamente. Notificaremos cambios significativos
              publicando la nueva versión en esta página con la fecha de actualización. El uso
              continuado del Servicio tras dichos cambios implica la aceptación de la política revisada.
            </p>
          </Section>

          <Section title="13. Contacto">
            <p>
              Para cualquier consulta relacionada con el tratamiento de sus datos personales:
            </p>
            <ul className="list-none space-y-1 text-gray-600">
              <li>📧 <a href="mailto:hola@fotodeporte.com.ar" className="text-blue-600 hover:underline">hola@fotodeporte.com.ar</a></li>
            </ul>
          </Section>

        </div>

        {/* Footer link */}
        <div className="mt-14 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link href="/terminos" className="text-blue-600 text-sm hover:underline">
            Ver Condiciones de Servicio →
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
            <Link href="/terminos" className="text-blue-600 text-xs hover:text-blue-400 transition-colors">Términos</Link>
            <Link href="/privacidad" className="text-blue-400 text-xs hover:text-white transition-colors">Privacidad</Link>
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

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-800 text-sm mb-2">{title}</h3>
      {children}
    </div>
  );
}
