from typing import Any

import pytest
import yaml

from app.services.git.discover import _AnsibleLoader
from app.services.git.role_usage import (
    assigned_names,
    used_in_tasks,
    used_in_template,
)


def tasks(text: str) -> Any:
    return yaml.load(text, Loader=_AnsibleLoader)  # noqa: S506 - SafeLoader subclass


class TestUsedInTemplate:
    def test_reads_variables_and_their_filters(self) -> None:
        assert used_in_template("{{ a | upper }} {{ b.c }} {{ d['e'] }}") == {
            "a",
            "b",
            "d",
        }

    def test_leaves_out_what_the_template_declares(self) -> None:
        text = "{% set a = 1 %}{% for b in c %}{{ a }}{{ b }}{% endfor %}"
        assert used_in_template(text) == {"c"}

    @pytest.mark.parametrize(
        "name",
        [
            "ansible_facts",
            "ANSIBLE_X",
            "inventory_hostname",
            "hostvars",
            "item",
            "omit",
        ],
    )
    def test_leaves_out_what_ansible_provides(self, name: str) -> None:
        assert used_in_template(f"{{{{ {name} }}}}") == set()

    def test_leaves_out_lookups_but_not_their_arguments(self) -> None:
        assert used_in_template("{{ lookup('env', a) }} {{ range(3) }}") == {"a"}

    def test_understands_filters_and_tests_only_ansible_has(self) -> None:
        text = "{{ a | to_nice_json }}{% if b is ansible.builtin.version('1', '>') %}{% endif %}"
        assert used_in_template(text) == {"a", "b"}

    def test_broken_syntax_means_nothing(self) -> None:
        assert used_in_template("{{ a") == set()

    def test_is_never_rendered(self) -> None:
        text = "{{ ''.__class__.__mro__ }}{% include 'x' %}"
        assert used_in_template(text) == set()


class TestUsedInTasks:
    def test_reads_any_level_and_bare_conditions(self) -> None:
        found = used_in_tasks(
            tasks(
                """
- block:
    - debug: {msg: "{{ nested }}"}
      when: condition
      until: [first, "second | bool"]
- copy: {dest: "/{{ dest }}", content: plain}
  failed_when: "{{ templated }}"
"""
            )
        )
        assert found == {"nested", "condition", "first", "second", "dest", "templated"}

    def test_a_tagged_scalar_is_not_a_template(self) -> None:
        assert used_in_tasks(tasks('- debug: {msg: !unsafe "{{ a }}"}')) == set()

    def test_survives_a_cyclic_yaml(self) -> None:
        assert used_in_tasks(tasks('- &a\n  x: "{{ b }}"\n  y: *a\n')) == {"b"}

    def test_a_when_that_is_not_text_is_ignored(self) -> None:
        assert used_in_tasks(tasks("- debug: {}\n  when: true\n")) == set()


class TestAssignedNames:
    def test_collects_what_tasks_leave_behind(self) -> None:
        found = assigned_names(
            tasks(
                """
- command: uptime
  register: result
- set_fact: {fact: 1}
- ansible.builtin.set_fact: {long_fact: 1}
- debug: {}
  vars: {local: 1}
  loop_control: {loop_var: entry}
"""
            )
        )
        assert found == {"result", "fact", "long_fact", "local", "entry"}
