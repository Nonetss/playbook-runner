---
title: Secretos con Ansible Vault
description: Guarda la contraseña de Vault en un repositorio Git para que sus playbooks puedan usar variables cifradas.
order: 8
---

Si un repositorio ya guarda sus secretos con [Ansible Vault](https://docs.ansible.com/ansible/latest/vault_guide/index.html), guarda su contraseña en Playbook Runner y sus playbooks funcionarán sin cambiar nada. Para secretos nuevos es mejor usar [Infisical](../infisical/), que además enmascara los valores en la salida. Los dos pueden convivir en la misma ejecución.

## Guardar la contraseña

1. En la página de Playbooks, crea o edita el repositorio.
2. Escribe la contraseña en **Contraseña de Ansible Vault** y guarda.

La contraseña se cifra antes de guardarse y la API nunca la devuelve. Para cambiarla, escribe la nueva; deja el campo vacío para conservar la actual, o marca **Quitar la contraseña guardada** para borrarla. No puede empezar ni terminar con espacios.

## Qué se puede cifrar

| Contenido | Resultado |
| --- | --- |
| Variables con `!vault` | Se descifran |
| Ficheros de variables cifrados, en `vars_files` o en un rol | Se descifran, pero la app no puede mostrar sus nombres al ejecutar |
| Un playbook cifrado entero | No se admite |
| Un playbook escrito en la app | No recibe la contraseña, así que un `!vault` falla |

Solo se admite una contraseña por repositorio, así que no se pueden usar varios Vault IDs. La contraseña se aplica a jobs y a ejecuciones manuales de ese repositorio, en el commit sincronizado.

Un playbook cifrado entero no aparece al sincronizar. Si otro lo importa con `import_playbook`, la ejecución se detiene antes de arrancar Ansible y nombra el fichero, porque el runner necesita leer las plays para ejecutarlas sobre tu selección. Una ruta de importación con plantillas no se comprueba.

## Proteger los valores en la salida

El runner enmascara la contraseña, pero no lo que Vault descifra: esos valores solo los ve Ansible. Una tarea que imprima un valor lo deja en la consola y en el historial del job, así que las tareas que los manejen necesitan `no_log`:

```yaml
- name: Escribir el fichero de entorno
  ansible.builtin.template:
    src: app.env.j2 # usa {{ db_password }}
    dest: /etc/app.env
    mode: "0600"
  no_log: true
```

## Si falla una ejecución

Con una contraseña incorrecta o sin contraseña, la ejecución falla y muestra el error de descifrado de Ansible. En un job, ese error queda en la ejecución del historial. Comprueba que el repositorio tiene la contraseña con la que se cifró ese commit y vuelve a ejecutar.

Durante una ejecución, la contraseña está en un fichero del directorio temporal del run, que se borra al terminar. Una tarea que se ejecute en el propio runner podría leerla, así que protege quién puede cambiar los playbooks del repositorio.
