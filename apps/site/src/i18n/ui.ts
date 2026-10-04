export const languages = { en: "English", es: "Español" } as const
export type Lang = keyof typeof languages
export const defaultLang: Lang = "en"

export const INSTALL_COMMAND =
  "curl -fsSL https://raw.githubusercontent.com/Nonetss/playbook-runner/main/scripts/bootstrap.sh | bash"

export type TourStopId = "inventory" | "run" | "git" | "history" | "api"

const en = {
  meta: {
    title: "Playbook Runner: a self-hosted web UI for Ansible",
    description:
      "Manage inventory, SSH credentials, playbooks and schedules, and watch every Ansible run live in the browser. Self-hosted with Docker Compose.",
  },
  nav: {
    tour: "Tour",
    architecture: "Architecture",
    install: "Install",
    docs: "Docs",
    github: "GitHub",
    skip: "Skip to content",
    theme: "Switch between light and dark theme",
    language: "Language",
    menu: "Menu",
  },
  copy: { idle: "Copy", done: "Copied", label: "Copy the install command" },
  hero: {
    title: "Run your playbooks from a browser tab.",
    lede: "Playbook Runner is a self-hosted web UI for Ansible: inventory, SSH credentials, playbooks, schedules and a live log of every run, without the weight of AWX or Tower.",
    installLabel: "Install on a server",
    installHint:
      "Run it in an empty directory. It asks a few questions, generates every secret and starts the stack with Docker Compose.",
    docs: "Read the docs",
    github: "Source on GitHub",
  },
  frame: {
    caption: "Screenshots of the running app",
  },
  tour: {
    heading: "What you get",
    stops: {
      inventory: {
        title: "Your inventory, with the right key attached.",
        body: "Devices and groups live in the database. Each device points at an SSH credential, so picking a group is enough: the right user and key follow every host. Generate an ed25519 pair in the browser and copy a ready-made script that provisions the user on a new host.",
        alt: "Inventory page listing devices, groups and SSH credentials",
      },
      run: {
        title: "Watch every task as it happens.",
        body: "Pick a playbook and a group, confirm, run. PLAY and TASK lines stream into the browser as ansible-runner emits them, with no polling. Close the tab and the run is cancelled on the executor.",
        alt: "A playbook run streaming its tasks live, with the inventory panel on the right",
      },
      git: {
        title: "Or keep your playbooks in Git.",
        body: "Add a repository over HTTPS or SSH, pick a branch and a subdirectory. Its playbooks show up read-only and run from a checkout of the synced commit, so roles, templates and group_vars next to them just work.",
        alt: "Dialog for adding a Git repository with branch and subdirectory",
      },
      history: {
        title: "Schedule it, then check what happened.",
        body: "Give a job a cron expression and the backend fires it on time. A job never overlaps with itself, and the history keeps the status, duration and hosts of every run.",
        alt: "A scheduled job with its last run and the history of every run",
      },
      api: {
        title: "Script it through the API.",
        body: "Every endpoint is documented in an interactive OpenAPI reference served at /scalar. Create a personal API key and call it from scripts or CI.",
        alt: "Interactive OpenAPI reference rendered by Scalar",
      },
    } satisfies Record<
      TourStopId,
      { title: string; body: string; alt: string }
    >,
    dashboardAlt:
      "Dashboard with job, playbook, device and credential counts and the recent activity",
    rest: {
      heading: "And the rest of the toolbox",
      items: [
        {
          term: "Scripts",
          text: "Save Bash or Python scripts and run them on a selection of hosts, with the same live console.",
        },
        {
          term: "Ad-hoc commands",
          text: "Run the shell or command module against any selection, with optional become, for one-offs that don't deserve a playbook.",
        },
        {
          term: "Users and roles",
          text: "No public sign-up. Admins create accounts and assign admin, user or pending, which can sign in but waits for approval.",
        },
        {
          term: "Single sign-on",
          text: "Any OIDC provider (Keycloak, Authentik, Google…) next to email and password. Three variables turn it on.",
        },
        {
          term: "API keys",
          text: "Personal keys sent as x-api-key, for scripts and CI pipelines.",
        },
        {
          term: "Installable on mobile",
          text: "The interface is a PWA: add it to your phone's home screen and check a run from anywhere.",
        },
      ],
    },
  },
  arch: {
    heading: "Four containers, one published port.",
    lede: "A Caddy gateway is the only thing exposed. It serves the Astro frontend and the Hono API from one origin, and routes the backend's gRPC calls to the Ansible executor, which never faces the network.",
    pathsLabel: "Request paths",
    pagePath: "Opening a page",
    runPath: "Running a playbook",
    nodes: {
      browser: "Browser",
      gateway: "Gateway",
      frontend: "Frontend",
      backend: "Backend",
      postgres: "PostgreSQL",
      grpc: "gRPC router",
      executor: "Executor",
      hosts: "Your hosts",
    },
    principles: [
      {
        term: "Private keys stay on the server.",
        text: "SSH keys are encrypted at rest with AES-256-GCM and never returned by the API. They are decrypted only to build a run, and the executor deletes the key files when it finishes.",
      },
      {
        term: "The executor has no database.",
        text: "The backend resolves the playbook, the hosts and their keys, then sends one complete payload over gRPC, authenticated with a shared service token. Output streams back on the same call.",
      },
      {
        term: "Runs are bounded.",
        text: "At most eight Ansible processes run at once by default; extra requests are refused instead of queued. SSH host keys are verified, trusting a host on first contact and rejecting changed keys.",
      },
    ],
    docsLink: "How it fits together",
  },
  install: {
    heading: "Up in one command.",
    lede: "On a Linux host with Docker, curl and openssl, from an empty directory:",
    stepsLabel: "What the script does",
    steps: [
      "Asks for the public URL, the port and the first admin, plus optional OIDC settings.",
      "Generates every secret with openssl, including the key that encrypts stored SSH keys.",
      "Writes .env and compose.yml in the current directory.",
      "Pulls the images from ghcr.io and starts the stack. The backend migrates the database and creates the admin on startup.",
    ],
    warning:
      "Back up the generated .env, above all CREDENTIALS_ENCRYPTION_KEY. Losing it makes every stored SSH key unrecoverable.",
    manual: "Prefer to set it up by hand?",
    manualLink: "Deploy with Docker Compose",
  },
  footer: {
    license: "Free software under the GNU GPL v3.0.",
    releases: "Releases",
    issues: "Issues",
    license_link: "License",
  },
  docs: {
    title: "Documentation",
    onThisPage: "On this page",
    pages: "Pages",
    edit: "Edit this page on GitHub",
    previous: "Previous",
    next: "Next",
  },
}

export type Dictionary = typeof en

const es: Dictionary = {
  meta: {
    title: "Playbook Runner: una interfaz web autoalojada para Ansible",
    description:
      "Gestiona inventario, credenciales SSH, playbooks y programaciones, y sigue cada ejecución de Ansible en directo desde el navegador. Autoalojado con Docker Compose.",
  },
  nav: {
    tour: "Recorrido",
    architecture: "Arquitectura",
    install: "Instalar",
    docs: "Documentación",
    github: "GitHub",
    skip: "Saltar al contenido",
    theme: "Cambiar entre tema claro y oscuro",
    language: "Idioma",
    menu: "Menú",
  },
  copy: {
    idle: "Copiar",
    done: "Copiado",
    label: "Copiar el comando de instalación",
  },
  hero: {
    title: "Lanza tus playbooks desde una pestaña del navegador.",
    lede: "Playbook Runner es una interfaz web autoalojada para Ansible: inventario, credenciales SSH, playbooks, programaciones y el registro en directo de cada ejecución, sin el peso de AWX o Tower.",
    installLabel: "Instalar en un servidor",
    installHint:
      "Ejecútalo en un directorio vacío. Hace unas pocas preguntas, genera todos los secretos y arranca el stack con Docker Compose.",
    docs: "Leer la documentación",
    github: "Código en GitHub",
  },
  frame: {
    caption: "Capturas de la aplicación en marcha",
  },
  tour: {
    heading: "Qué incluye",
    stops: {
      inventory: {
        title: "Tu inventario, con la clave correcta ya asignada.",
        body: "Dispositivos y grupos viven en la base de datos. Cada dispositivo apunta a una credencial SSH, así que basta con elegir un grupo: el usuario y la clave correctos acompañan a cada host. Genera un par ed25519 en el navegador y copia un script que da de alta el usuario en un host nuevo.",
        alt: "Página de inventario con dispositivos, grupos y credenciales SSH",
      },
      run: {
        title: "Mira cada tarea mientras ocurre.",
        body: "Elige un playbook y un grupo, confirma y ejecuta. Las líneas PLAY y TASK llegan al navegador a medida que ansible-runner las emite, sin sondeos. Si cierras la pestaña, la ejecución se cancela en el ejecutor.",
        alt: "Ejecución de un playbook mostrando sus tareas en directo, con el panel de inventario a la derecha",
      },
      git: {
        title: "O guarda tus playbooks en Git.",
        body: "Añade un repositorio por HTTPS o SSH, elige rama y subdirectorio. Sus playbooks aparecen en solo lectura y se ejecutan desde una copia del commit sincronizado, así que los roles, plantillas y group_vars que tengan al lado funcionan sin más.",
        alt: "Diálogo para añadir un repositorio Git con rama y subdirectorio",
      },
      history: {
        title: "Prográmalo y luego revisa qué pasó.",
        body: "Dale a un job una expresión cron y el backend lo lanza a su hora. Un job nunca se solapa consigo mismo, y el historial guarda el estado, la duración y los hosts de cada ejecución.",
        alt: "Un job programado con su última ejecución y el historial de todas",
      },
      api: {
        title: "Automatízalo a través de la API.",
        body: "Cada endpoint está documentado en una referencia OpenAPI interactiva servida en /scalar. Crea una API key personal y llámala desde scripts o CI.",
        alt: "Referencia OpenAPI interactiva generada con Scalar",
      },
    },
    dashboardAlt:
      "Dashboard con el número de jobs, playbooks, dispositivos y credenciales, y la actividad reciente",
    rest: {
      heading: "Y el resto de la caja de herramientas",
      items: [
        {
          term: "Scripts",
          text: "Guarda scripts de Bash o Python y ejecútalos sobre una selección de hosts, con la misma consola en directo.",
        },
        {
          term: "Comandos ad-hoc",
          text: "Lanza el módulo shell o command contra cualquier selección, con become opcional, para lo puntual que no merece un playbook.",
        },
        {
          term: "Usuarios y roles",
          text: "Sin registro público. Los administradores crean las cuentas y asignan admin, user o pending, que puede iniciar sesión pero espera aprobación.",
        },
        {
          term: "Inicio de sesión único",
          text: "Cualquier proveedor OIDC (Keycloak, Authentik, Google…) junto a email y contraseña. Se activa con tres variables.",
        },
        {
          term: "API keys",
          text: "Claves personales enviadas como x-api-key, para scripts y pipelines de CI.",
        },
        {
          term: "Instalable en el móvil",
          text: "La interfaz es una PWA: añádela a la pantalla de inicio y revisa una ejecución desde cualquier sitio.",
        },
      ],
    },
  },
  arch: {
    heading: "Cuatro contenedores, un único puerto publicado.",
    lede: "Solo se expone un gateway Caddy. Sirve el frontend Astro y la API Hono desde un mismo origen, y enruta las llamadas gRPC del backend al ejecutor de Ansible, que nunca queda expuesto a la red.",
    pathsLabel: "Recorrido de las peticiones",
    pagePath: "Abrir una página",
    runPath: "Ejecutar un playbook",
    nodes: {
      browser: "Navegador",
      gateway: "Gateway",
      frontend: "Frontend",
      backend: "Backend",
      postgres: "PostgreSQL",
      grpc: "Router gRPC",
      executor: "Ejecutor",
      hosts: "Tus hosts",
    },
    principles: [
      {
        term: "Las claves privadas no salen del servidor.",
        text: "Las claves SSH se cifran en reposo con AES-256-GCM y la API nunca las devuelve. Solo se descifran para preparar una ejecución, y el ejecutor borra los ficheros de clave al terminar.",
      },
      {
        term: "El ejecutor no tiene base de datos.",
        text: "El backend resuelve el playbook, los hosts y sus claves, y envía un único paquete completo por gRPC, autenticado con un token compartido. La salida vuelve por la misma llamada.",
      },
      {
        term: "Las ejecuciones tienen límite.",
        text: "Por defecto corren como mucho ocho procesos de Ansible a la vez; las peticiones de más se rechazan en lugar de encolarse. Las claves de host SSH se verifican: se confía en el primer contacto y se rechazan las que cambian.",
      },
    ],
    docsLink: "Cómo encaja todo",
  },
  install: {
    heading: "En marcha con un solo comando.",
    lede: "En un host Linux con Docker, curl y openssl, desde un directorio vacío:",
    stepsLabel: "Qué hace el script",
    steps: [
      "Pregunta la URL pública, el puerto y el primer administrador, y opcionalmente los datos de OIDC.",
      "Genera todos los secretos con openssl, incluida la clave que cifra las claves SSH guardadas.",
      "Escribe .env y compose.yml en el directorio actual.",
      "Descarga las imágenes de ghcr.io y arranca el stack. El backend migra la base de datos y crea el administrador al arrancar.",
    ],
    warning:
      "Haz copia del .env generado, sobre todo de CREDENTIALS_ENCRYPTION_KEY. Si la pierdes, ninguna clave SSH guardada se podrá recuperar.",
    manual: "¿Prefieres montarlo a mano?",
    manualLink: "Desplegar con Docker Compose",
  },
  footer: {
    license: "Software libre bajo la GNU GPL v3.0.",
    releases: "Versiones",
    issues: "Incidencias",
    license_link: "Licencia",
  },
  docs: {
    title: "Documentación",
    onThisPage: "En esta página",
    pages: "Páginas",
    edit: "Editar esta página en GitHub",
    previous: "Anterior",
    next: "Siguiente",
  },
}

export const ui: Record<Lang, Dictionary> = { en, es }

export function t(lang: Lang): Dictionary {
  return ui[lang]
}
