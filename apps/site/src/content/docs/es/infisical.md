---
title: Secretos con Infisical
description: Declara las variables que necesita un playbook, elige sus secretos de Infisical y deja que el runner los entregue a cada ejecución.
order: 7
---

Un playbook usa variables normales y nunca menciona Infisical. Tú eliges qué secreto rellena cada variable, y el runner lee los valores justo antes de arrancar Ansible. Los valores nunca llegan al backend, a la base de datos ni al navegador.

```yaml
- name: Configurar la aplicación
  hosts: web
  tasks:
    - name: Escribir el fichero de entorno
      ansible.builtin.template:
        src: app.env.j2 # usa {{ db_password }}
        dest: /etc/app.env
        mode: "0600"
      no_log: true
```

## Crear una conexión

1. En Infisical, crea una identidad de máquina con **Universal Auth** y dale acceso solo al proyecto y las rutas que necesite.
2. Abre **Ansible → Infisical**, crea una conexión e introduce la URL de Infisical, el Project ID (en **Project Settings**), el Client ID y el Client Secret.

El Client Secret se cifra antes de guardarse y la API nunca lo devuelve. Para rotarlo, edita la conexión e introduce el nuevo; deja el campo vacío para conservar el actual.

Una conexión que usa un job o un playbook no se puede eliminar. Quítala antes de ellos.

## Declarar los secretos de un playbook

Abre la página de edición del playbook y usa el panel **Secretos de Infisical** de la derecha, que tiene su propio botón de guardar. Elige la conexión y el entorno por defecto, y añade una fila por variable: el secreto y el nombre de la variable, que se sugiere a partir del secreto. También funciona en playbooks de Git, porque la declaración se guarda aparte de su contenido de solo lectura y una sincronización nunca la cambia.

La lista solo muestra nombres, de la raíz del entorno, así que no se pueden elegir secretos dentro de carpetas. Si un secreto deja de aparecer, sigue visible en su fila para que puedas sustituirlo.

## Ejecutar con secretos

Las variables que declara un playbook aparecen rellenas en la página de ejecución y en el formulario del job, marcadas como **del playbook**. Puedes apuntar una a otro secreto para esa ejecución o ese job, pero no quitarla, porque el playbook cuenta con ella.

También puedes cambiar la conexión o el entorno y añadir variables, cada una de texto o de secreto. Sin conexión, solo se ofrece texto.

| Ajuste | Qué usa una ejecución |
| --- | --- |
| Conexión | La de la ejecución o el job; si no, la del playbook |
| Entorno | El de la ejecución o el job; si no, el del playbook |
| Variables | Las del playbook más las de la ejecución o el job. Un mismo nombre sustituye al secreto del playbook |

Un job guarda solo sus propias entradas, así que los cambios posteriores en la declaración del playbook le siguen llegando. Lo que eliges para una ejecución interactiva no se guarda.

El slug de un entorno pertenece a un proyecto, así que si cambias de conexión, elige también su entorno. Si no, la ejecución se detiene en el primer secreto que no encuentre.

## Cuándo se detiene una ejecución antes de Ansible

El runner lee primero todos los secretos, así que una ejecución nunca arranca con uno ausente. Falla, indicando la variable, cuando:

- Infisical no es accesible, no responde dentro de `INFISICAL_TIMEOUT_S` o rechaza las credenciales.
- Un secreto no existe en ese entorno y esa ruta.
- La identidad puede listar un secreto, pero no leer su valor.
- La conexión no tiene Project ID. Las creadas antes de que existiera este campo hay que editarlas para añadirlo.
- Una extra var se llama igual que una variable secreta.

Los jobs programados fallan igual y muestran el error en su historial.

## Límites que debes tener en cuenta

- **Usa `no_log: true` en las tareas que transformen o impriman secretos.** El runner enmascara en eventos y logs los valores literales de al menos 4 caracteres, pero no un valor transformado, como una codificación en base64. La salida de las tareas se guarda en el historial.
- **Quien pueda editar o ejecutar un playbook puede leer lo que permita su conexión.** Puede elegir cualquier secreto en la página de ejecución o imprimirlo desde una tarea. El control que de verdad importa es dar el mínimo acceso en Infisical.
- **Las conexiones no aíslan a los usuarios entre sí.** Cualquier usuario activo puede usar cualquier conexión, y las ejecuciones comparten un usuario de sistema en el runner, así que un playbook con tareas locales podría leer el fichero de secretos de otra ejecución en curso. Lo mismo ocurre ya con las claves SSH. El fichero solo lo puede leer su propietario y se elimina al terminar la ejecución.
- **Cada ejecución depende de que Infisical esté disponible.** Los valores no se guardan entre ejecuciones.
- **No definas variables `INFISICAL_*` en el contenedor del runner.** Las heredarían todas las ejecuciones, incluso las que no tienen conexión.
- El contenedor del runner necesita acceso de red a tu instancia de Infisical.

## Usar la colección directamente

La imagen del runner sigue incluyendo la colección `infisical.vault`. Elegir una conexión no da credenciales a sus lookups ni a sus módulos, y así quedan fuera del alcance de cada tarea. Para usar la colección, pásalas de forma explícita, por ejemplo desde dos variables secretas declaradas. Sus módulos no leen el entorno y se ejecutan en el host de destino, donde normalmente falta el SDK de Infisical, así que también necesitan `delegate_to: localhost`.

```yaml
- name: Leer secretos con el módulo
  infisical.vault.read_secrets:
    url: https://infisical.example.com
    auth_method: universal_auth
    universal_auth_client_id: "{{ infisical_client_id }}"
    universal_auth_client_secret: "{{ infisical_client_secret }}"
    project_id: "<project-id>"
    env_slug: prod
    path: /
    as_dict: true
  delegate_to: localhost
  register: secrets
  no_log: true
```
