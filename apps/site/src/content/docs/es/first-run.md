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

Guárdalo y pulsa **Ejecutar**. Elige el dispositivo (o un grupo), revisa el paso de confirmación y lanza la ejecución. Las líneas `PLAY`, `TASK` y el resumen final llegan a la consola a medida que Ansible las emite. Si cierras la pestaña, la ejecución se cancela en el ejecutor.

La primera vez que Playbook Runner se conecta a un host guarda su clave SSH, y la rechaza si cambia más adelante. Consulta `SSH_HOST_KEY_POLICY` en [Configuración](../configuration/) para cambiar ese comportamiento.

## 4. Prográmalo

Desde **Ansible → Scheduler**, crea un job: un playbook, un destino y una expresión cron como `0 2 * * *` (todos los días a las 02:00). El backend lo lanza a su hora; un job nunca se ejecuta dos veces a la vez, y cada ejecución queda en **Historial** con su estado, duración y hosts.

## Playbooks de ejemplo

El repositorio incluye algunos para empezar en [`playbooks/`](https://github.com/Nonetss/playbook-runner/tree/main/playbooks): `ping.yml`, `apt-upgrade.yml`, `disk-usage.yml`, `check-uptime.yml`, `gather-facts.yml`, `restart-service.yml`, `clean-docker-img.yml` y `fail2ban-status.yml`.

Para probar con ellos la integración con Git, pulsa **Añadir repositorio** en la página de Playbooks e introduce:

| Campo | Valor |
| --- | --- |
| URL de clonado | `https://github.com/Nonetss/playbook-runner.git` |
| Rama | `main` |
| Subdirectorio | `playbooks` |

Cada fichero aparece como un playbook de solo lectura que puedes ejecutar y programar. **Hacer copia en Playbook Runner** lo convierte en un playbook normal y editable.
