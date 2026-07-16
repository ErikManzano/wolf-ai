/**
 * Legal copy — Terms of Service & Privacy Policy (v1, Julio 2026).
 * Fitness SaaS LATAM baseline; not a substitute for counsel.
 */

export const LEGAL_LAST_UPDATED = '2026-07-13';

export function termsBody(isEs: boolean): string[] {
  if (isEs) {
    return [
      'Bienvenido a Wolf (“el Servicio”). Al crear una cuenta o usar la plataforma aceptas estos Términos de uso.',
      '1. Descripción del servicio. Wolf es una herramienta SaaS para coaches y atletas de fuerza y halterofilia: programación, asignación de planes y registro de entrenamientos. No sustituye asesoramiento médico ni diagnóstico.',
      '2. Cuentas. Eres responsable de la confidencialidad de tus credenciales y de la exactitud de los datos que introduzcas (incluyendo PRs y datos de atletas). Los coaches deben tener base legítima para gestionar datos de sus atletas.',
      '3. Planes y pagos. El plan Free incluye límites (p. ej. atletas y programas activos). El plan Pro elimina esos límites según la configuración vigente. Los precios pueden cambiar con aviso razonable. Sin pasarela activa, las activaciones Pro pueden realizarse manualmente por el operador.',
      '4. Uso aceptable. No uses el Servicio para actividades ilegales, scraping abusivo, ni para almacenar datos de terceros sin consentimiento. Nos reservamos el derecho de suspender cuentas que violen estos términos.',
      '5. Propiedad intelectual. El software, marca y contenido propio de Wolf permanecen de sus titulares. Tú retienes los derechos sobre los programas y datos que creas.',
      '6. Limitación de responsabilidad. El Servicio se ofrece “tal cual”. En la máxima medida permitida por la ley, Wolf no responde por lesiones, pérdidas de rendimiento deportivo o daños indirectos derivados del uso.',
      '7. Ley aplicable. Estos términos se interpretan según la legislación aplicable en el país de operación del prestador, sin perjuicio de derechos imperativos del consumidor.',
      '8. Contacto. Para dudas legales: legal@wolf.ai (placeholder — actualizar con correo real).',
    ];
  }
  return [
    'Welcome to Wolf (“the Service”). By creating an account or using the platform you agree to these Terms of Use.',
    '1. Service description. Wolf is a SaaS tool for strength and weightlifting coaches and athletes: programming, plan assignment, and workout logging. It does not replace medical advice or diagnosis.',
    '2. Accounts. You are responsible for credential confidentiality and for the accuracy of data you enter (including PRs and athlete data). Coaches must have a legitimate basis to manage their athletes’ data.',
    '3. Plans and payments. The Free plan includes limits (e.g. athletes and active programs). Pro removes those limits per current configuration. Prices may change with reasonable notice. Without an active payment gateway, Pro may be activated manually by the operator.',
    '4. Acceptable use. Do not use the Service for illegal activity, abusive scraping, or storing third-party data without consent. We may suspend accounts that violate these terms.',
    '5. Intellectual property. Wolf software, brand, and proprietary content remain with their owners. You retain rights to programs and data you create.',
    '6. Limitation of liability. The Service is provided “as is.” To the fullest extent permitted by law, Wolf is not liable for injuries, sports-performance losses, or indirect damages arising from use.',
    '7. Governing law. These terms are construed under the laws of the operator’s jurisdiction, without prejudice to mandatory consumer rights.',
    '8. Contact. Legal inquiries: legal@wolf.ai (placeholder — replace with a real address).',
  ];
}

export function privacyBody(isEs: boolean): string[] {
  if (isEs) {
    return [
      'Esta Política de privacidad describe cómo Wolf trata datos personales en la plataforma.',
      '1. Datos que recogemos. Cuenta (nombre, email/usuario, contraseña hasheada), perfil de atleta (peso, nivel, marcas 1RM), programas, registros de series, y metadatos técnicos (IP, logs de autenticación).',
      '2. Finalidad. Prestar el Servicio, autenticar usuarios, sincronizar planes coach–atleta, facturación/límites de plan, seguridad y mejora del producto.',
      '3. Base. Ejecución de contrato (cuenta y Servicio), interés legítimo (seguridad, mejora) y, cuando aplique, consentimiento.',
      '4. Encargados. Podemos usar proveedores de hosting (p. ej. Netlify, Railway, Neon/Postgres) bajo acuerdos de tratamiento. No vendemos datos personales.',
      '5. Conservación. Mientras la cuenta esté activa y el tiempo necesario para obligaciones legales. Puedes solicitar acceso, rectificación o eliminación escribiendo a privacy@wolf.ai (placeholder).',
      '6. Datos de salud / fitness. Tratamos marcas y logs de entrenamiento como datos sensibles del contexto deportivo. No uses la plataforma para historial clínico médico.',
      '7. Transferencias. Si operamos con infraestructura en otra región, aplicaremos salvaguardas razonables.',
      '8. Menores. El Servicio no está dirigido a menores de 16 años sin consentimiento parental cuando la ley lo exija.',
      '9. Cambios. Publicaremos la fecha de actualización en esta página.',
    ];
  }
  return [
    'This Privacy Policy describes how Wolf processes personal data on the platform.',
    '1. Data we collect. Account (name, email/username, hashed password), athlete profile (bodyweight, level, 1RM marks), programs, set logs, and technical metadata (IP, auth logs).',
    '2. Purpose. Deliver the Service, authenticate users, sync coach–athlete plans, billing/plan limits, security, and product improvement.',
    '3. Legal basis. Contract performance (account and Service), legitimate interest (security, improvement), and consent where required.',
    '4. Processors. We may use hosting providers (e.g. Netlify, Railway, Neon/Postgres) under processing agreements. We do not sell personal data.',
    '5. Retention. While the account is active and as needed for legal obligations. You may request access, correction, or deletion via privacy@wolf.ai (placeholder).',
    '6. Fitness data. We treat training marks and logs as sensitive sports-context data. Do not use the platform for clinical medical records.',
    '7. Transfers. If we use infrastructure in another region, we apply reasonable safeguards.',
    '8. Minors. The Service is not directed at children under 16 without parental consent where required.',
    '9. Changes. We will publish the update date on this page.',
  ];
}
