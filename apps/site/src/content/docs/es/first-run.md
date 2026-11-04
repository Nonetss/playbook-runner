---
title: Tu primera ejecución
description: Guarda una credencial SSH, añade un host y ejecuta un playbook contra él, en directo.
order: 2
---

Esta guía lleva una instalación recién hecha hasta su primera ejecución correcta. Necesitas un host al que se pueda llegar por SSH desde el servidor donde corre Playbook Runner.

## 1. Añade una credencial SSH

Abre **Inventario → Credenciales** y crea una credencial. Una credencial es un usuario SSH más un par de claves. Puedes:

- **Importar clave existente**, pegando una clave privada que ya uses, o
- **Generar par de claves**, un par ed25519 nuevo creado en el navegador.

Con una clave generada, la credencial ofrece un **script de aprovisionamiento**: ejecútalo una vez como root en el host de destino y crea el usuario, autoriza la clave pública y le da `sudo` sin contraseña.

La clave privada se cifra antes de guardarse y la API nunca la devuelve. Solo se descifra en el servidor, cuando una ejecución la necesita.

## 2. Añade un dispositivo

Abre **Inventario → Dispositivos** y añade el host: un nombre, su dirección IP y puerto SSH, y la credencial del paso anterior. Los nombres de dispositivos y grupos admiten letras, dígitos, `.`, `_` y `-`, hasta 64 caracteres.

Agrupa dispositivos en **grupos** para apuntar a varios a la vez. Como cada dispositivo lleva su propia credencial, un grupo puede mezclar hosts con usuarios y claves distintos. El grupo integrado **All** contiene siempre todos los dispositivos, también los que añadas después, así que un job programado contra él cubre todo el inventario; por eso `all` (en mayúsculas o minúsculas) no se puede usar como nombre de grupo.

## 3. Ejecuta un playbook

Abre **Ansible → Playbooks** y crea un playbook. Este comprueba que SSH y Python funcionan en cada host:

```yaml
- name: Ping
  hosts: all
  gather_facts: false
  tasks:
    - name: Ping
      ansible.builtin.ping:
```

Una play siempre se ejecuta en los dispositivos que selecciones para la ejecución: Playbook Runner ignora lo que diga `hosts`, incluido `localhost`. Para ejecutar una tarea en el runner, usa `delegate_to: localhost`.

Guárdalo y pulsa **Ejecutar**. Elige el dispositivo (o un grupo), revisa el paso de confirmación y lanza la ejecución. Las líneas `PLAY`, `TASK` y el resumen final llegan a la consola a medida que Ansible las emite. Si cierras la pestaña, la ejecución se cancela en el ejecutor.

La primera vez que Playbook Runner se conecta a un host guarda su clave SSH, y la rechaza si cambia más adelante. Consulta `SSH_HOST_KEY_POLICY` en [Configuración](../configuration/) para cambiar ese comportamiento.

## 4. Prográmalo

Desde **Ansible → Scheduler**, crea un job: un playbook, un destino y una expresión cron como `0 2 * * *` (todos los días a las 02:00). El backend lo lanza a su hora; un job nunca se ejecuta dos veces a la vez, y cada ejecución queda en **Historial** con su estado, duración y hosts.

## Playbooks de ejemplo

El repositorio incluye algunos para empezar en [`playbooks/`](https://github.com/Nonetss/playbook-runner/tree/main/playbooks): `ping.yml`, `apt-upgrade.yml`, `disk-usage.yml`, `check-uptime.yml`, `gather-facts.yml`, `restart-service.yml`, `clean-docker-img.yml`, `fail2ban-status.yml` y `system-report.yml`, que está construido con roles.

Para probar con ellos la integración con Git, pulsa **Añadir repositorio** en la página de Playbooks e introduce:

| Campo | Valor |
| --- | --- |
| URL de clonado | `https://github.com/Nonetss/playbook-runner.git` |
| Rama | `main` |
| Subdirectorio | `playbooks` |

Cada fichero aparece como un playbook de solo lectura que puedes ejecutar y programar. **Hacer copia en Playbook Runner** lo convierte en un playbook normal y editable.

## Roles en un repositorio Git

Un playbook de Git puede usar los [roles de Ansible](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html) guardados en su repositorio, en el mismo commit sincronizado. Una ejecución busca en cada directorio `roles/` desde la carpeta del playbook hasta la raíz del repositorio, y gana el más cercano:

```text
playbooks/site.yml      # usa roles de los dos directorios siguientes
playbooks/roles/        # se busca primero
roles/                  # se busca después
```

El `ansible.cfg` propio del repositorio se ignora, así que un `roles_path` personalizado no tiene efecto. Cuando una ejecución encuentra alguno de estos directorios, sustituyen a las rutas de roles por defecto de Ansible, como `/usr/share/ansible/roles`; esto solo importa si has creado tu propia imagen con roles instalados allí.

Para verlo funcionando, sincroniza el repositorio de ejemplo anterior y ejecuta `system-report.yml`, que usa los dos roles de [`playbooks/roles/`](https://github.com/Nonetss/playbook-runner/tree/main/playbooks/roles).

Cada repositorio de la página de Playbooks muestra sus roles en solo lectura. Para cambiar un rol, haz un commit en el repositorio y sincronízalo. Los roles no están disponibles para los playbooks escritos en Playbook Runner, porque son un único fichero.

Con un repositorio desplegado, cada tarjeta de playbook nombra los roles que declara y cada rol nombra los playbooks que lo declaran. Sale de `roles`, `include_role` e `import_role` en los plays del playbook, siguiendo `import_playbook`. No se cuentan los roles a los que se llega por `include_tasks` o por las dependencias de otro rol, así que «ningún playbook lo declara directamente» no significa que el rol no se use. Un nombre que solo se conoce al ejecutar aparece como «rol dinámico».

Al ejecutar a mano un playbook de Git, el formulario muestra los roles del repositorio que declara, todos marcados. Desmarca uno para dejarlo fuera de esa ejecución: se vacía en la copia de la ejecución, así que no cambian ni el playbook ni el repositorio, y tampoco corren sus dependencias. Las tareas propias del playbook se ejecutan siempre, y los handlers, `defaults` y `vars` del rol desmarcado siguen disponibles. Otro rol que dependa de lo que hacía puede fallar. Los jobs programados ejecutan siempre todos los roles.

El mismo formulario muestra las variables que define el playbook: `vars` y `vars_files` de sus plays y, de los roles que declara, los `vars` junto a cada uno y sus `defaults` y `vars`. Los playbooks escritos en Playbook Runner también, a partir de los `vars` de sus plays. El panel de secretos del playbook sugiere esos mismos nombres al elegir conexión y entorno, para apuntar uno a un secreto con un clic. También incluyen lo que un rol lee en sus tareas y plantillas sin que nada lo defina, así que un rol puede pedir un secreto sin que el playbook lo mencione. Con el botón junto a cada una la sobrescribes para esa ejecución, pasándola como extra var. Los valores solo se muestran si son simples: los cifrados, las listas, los diccionarios y los nombres que parecen sensibles (`password`, `token`, `key`…) aparecen sin valor. No se detectan las de `group_vars`, `include_vars` ni las dependencias de un rol, y las `ansible_*` se omiten porque una ejecución no puede sobrescribirlas.

Las dependencias de `requirements.yml` **no se instalan**. La página avisa cuando encuentra ese fichero en la raíz del repositorio, en el subdirectorio configurado, o directamente en `roles/` o `collections/` de esos niveles. Un playbook que use uno de esos roles externos falla con un error de rol no encontrado; para usarlo, copia el rol en el repositorio.
