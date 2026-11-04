import pytest

from app.services.git import discover as discover_module
from app.services.git.discover import (
    DiscoveredRole,
    DiscoveredRoles,
    discover,
    discover_roles,
    is_playbook,
)


@pytest.mark.parametrize(
    "content",
    [
        "- hosts: all\n  tasks: []\n",
        "- import_playbook: other.yml\n",
        "- ansible.builtin.import_playbook: other.yml\n",
        "- hosts: web\n- import_playbook: db.yml\n",
        "- hosts: all\n  vars:\n    secret: !vault |\n      $ANSIBLE_VAULT;1.1;AES256\n      6162\n",
        "- hosts: all\n  vars:\n    raw: !unsafe '{{ x }}'\n",
    ],
)
def test_is_playbook_accepts_plays(content: str) -> None:
    assert is_playbook(content)


@pytest.mark.parametrize(
    "content",
    [
        "",
        "[]\n",
        "foo: bar\n",
        "- name: a task list\n  debug: msg=x\n",
        "- hosts: all\n- just a string\n",
        "- hosts: [unclosed\n",
        "key: value: other\n",
    ],
)
def test_is_playbook_rejects_non_playbooks(content: str) -> None:
    assert not is_playbook(content)


def test_discover_finds_only_playbooks(
    git_mirror, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(discover_module, "MAX_PLAYBOOK_BYTES", 1024)
    found = discover(git_mirror.repository_id, git_mirror.commit, "")

    # Skipped: roles/ and hidden dirs, non-playbook YAML, the oversized
    # big.yml, non-YAML files and the symlink.
    assert {p.path: p.content for p in found} == {
        "site.yml": git_mirror.files["site.yml"],
        "nested/web.yaml": git_mirror.files["nested/web.yaml"],
    }


def test_discover_includes_files_under_the_limit(git_mirror) -> None:
    found = discover(git_mirror.repository_id, git_mirror.commit, "")
    assert "big.yml" in {p.path for p in found}


def test_discover_honours_subdir(git_mirror) -> None:
    found = discover(git_mirror.repository_id, git_mirror.commit, "nested")
    assert [p.path for p in found] == ["nested/web.yaml"]


def test_discover_stops_at_max_playbooks(
    git_mirror, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(discover_module, "MAX_PLAYBOOKS", 1)
    assert len(discover(git_mirror.repository_id, git_mirror.commit, "")) == 1


class TestDiscoverRoles:
    @staticmethod
    def discover(
        monkeypatch: pytest.MonkeyPatch,
        files: dict[str, bytes],
        subdir: str = "",
    ) -> DiscoveredRoles:
        monkeypatch.setattr(
            discover_module,
            "list_tree",
            lambda _repo, _commit, subdir: [
                (path, path, len(content))
                for path, content in sorted(files.items())
                if path.startswith(subdir)
            ],
        )
        monkeypatch.setattr(
            discover_module, "read_blob", lambda _repo, blob: files[blob]
        )
        return discover_roles("repo", "commit", subdir)

    @staticmethod
    def paths(found: DiscoveredRoles) -> list[str]:
        return [role.path for role in found.roles]

    def test_on_a_real_mirror(self, git_mirror) -> None:
        found = discover_roles(git_mirror.repository_id, git_mirror.commit, "")
        assert found.roles == [DiscoveredRole(name="x", path="roles/x")]
        assert found.requirements_files == []

    @pytest.mark.parametrize(
        "marker",
        ["tasks/main.yml", "tasks/main.yaml", "meta/main.yml", "meta/main.yaml"],
    )
    def test_markers(self, monkeypatch: pytest.MonkeyPatch, marker: str) -> None:
        found = self.discover(monkeypatch, {f"roles/web/{marker}": b"[]\n"})
        assert found.roles == [DiscoveredRole(name="web", path="roles/web")]

    @pytest.mark.parametrize(
        "path",
        [
            "roles/web/README.md",
            "roles/web/tasks/install.yml",
            "roles/web/handlers/main.yml",
            "roles/main.yml",
            "roles/requirements.yml",
            "roles/a/roles/b/tasks/main.yml",
            "collections/ansible_collections/acme/web/roles/x/tasks/main.yml",
            ".github/roles/x/tasks/main.yml",
            "roles/.hidden/tasks/main.yml",
            "site.yml",
        ],
    )
    def test_not_a_role(self, monkeypatch: pytest.MonkeyPatch, path: str) -> None:
        assert self.discover(monkeypatch, {path: b"[]\n"}).roles == []

    def test_nested_role_does_not_hide_its_parent(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        found = self.discover(
            monkeypatch,
            {
                "roles/a/tasks/main.yml": b"[]\n",
                "roles/a/roles/b/tasks/main.yml": b"[]\n",
            },
        )
        assert self.paths(found) == ["roles/a"]

    def test_subdir_scope(self, monkeypatch: pytest.MonkeyPatch) -> None:
        found = self.discover(
            monkeypatch,
            {
                "roles/base/tasks/main.yml": b"[]\n",
                "infra/roles/web/tasks/main.yml": b"[]\n",
                "infra/deep/roles/db/tasks/main.yml": b"[]\n",
                "apps/roles/api/tasks/main.yml": b"[]\n",
                "infrastructure/roles/other/tasks/main.yml": b"[]\n",
            },
            subdir="/infra/",
        )
        assert self.paths(found) == [
            "infra/deep/roles/db",
            "infra/roles/web",
            "roles/base",
        ]

    def test_ordered_by_path_and_capped(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(discover_module, "MAX_ROLES", 2)
        found = self.discover(
            monkeypatch,
            {
                "roles/c/tasks/main.yml": b"[]\n",
                "roles/a/tasks/main.yml": b"[]\n",
                "roles/b/tasks/main.yml": b"[]\n",
            },
        )
        assert self.paths(found) == ["roles/a", "roles/b"]

    def test_description(self, monkeypatch: pytest.MonkeyPatch) -> None:
        found = self.discover(
            monkeypatch,
            {
                "roles/web/meta/main.yml": (
                    b"galaxy_info:\n  description: ' Installs nginx '\n"
                    b"secret: !vault |\n  $ANSIBLE_VAULT\n"
                ),
            },
        )
        assert found.roles[0].description == "Installs nginx"

    def test_description_is_capped(self, monkeypatch: pytest.MonkeyPatch) -> None:
        text = "x" * (discover_module.MAX_ROLE_DESCRIPTION_CHARS + 10)
        found = self.discover(
            monkeypatch,
            {
                "roles/web/meta/main.yml": f"galaxy_info:\n  description: {text}\n".encode()
            },
        )
        assert found.roles[0].description == text[:-10]

    @pytest.mark.parametrize(
        "content",
        [
            b"galaxy_info: [unclosed\n",
            b"\xff\xfe\x00",
            b"just a string\n",
            b"galaxy_info: not a mapping\n",
            b"galaxy_info:\n  description: 12\n",
            b"galaxy_info:\n  description: '  '\n",
        ],
    )
    def test_bad_metadata_keeps_the_role(
        self, monkeypatch: pytest.MonkeyPatch, content: bytes
    ) -> None:
        found = self.discover(monkeypatch, {"roles/web/meta/main.yml": content})
        assert found.roles == [DiscoveredRole(name="web", path="roles/web")]

    def test_oversized_metadata_is_not_read(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(discover_module, "MAX_PLAYBOOK_BYTES", 10)
        found = self.discover(
            monkeypatch,
            {"roles/web/meta/main.yml": b"galaxy_info:\n  description: big\n"},
        )
        assert found.roles == [DiscoveredRole(name="web", path="roles/web")]

    @pytest.mark.parametrize(
        "path",
        [
            "requirements.yml",
            "requirements.yaml",
            "roles/requirements.yml",
            "collections/requirements.yaml",
            "infra/requirements.yml",
            "infra/roles/requirements.yml",
            "infra/collections/requirements.yml",
        ],
    )
    def test_requirements_locations(
        self, monkeypatch: pytest.MonkeyPatch, path: str
    ) -> None:
        found = self.discover(monkeypatch, {path: b"[]\n"}, subdir="infra")
        assert found.requirements_files == [path]
        assert found.roles == []

    @pytest.mark.parametrize(
        "path",
        [
            "other/requirements.yml",
            "infra/deep/requirements.yml",
            "roles/web/requirements.yml",
            "requirements.txt",
        ],
    )
    def test_requirements_elsewhere_are_ignored(
        self, monkeypatch: pytest.MonkeyPatch, path: str
    ) -> None:
        found = self.discover(monkeypatch, {path: b"[]\n"}, subdir="infra")
        assert found.requirements_files == []

    def usages(
        self,
        monkeypatch: pytest.MonkeyPatch,
        files: dict[str, str],
        subdir: str = "",
    ) -> dict[str, tuple[list[str], bool]]:
        found = self.discover(
            monkeypatch, {p: c.encode() for p, c in files.items()}, subdir
        )
        return {u.path: (u.roles, u.dynamic) for u in found.playbook_roles}

    def test_roles_in_every_form(self, monkeypatch: pytest.MonkeyPatch) -> None:
        playbook = """
- hosts: all
  roles:
    - plain
    - role: with_role_key
    - name: with_name_key
  pre_tasks:
    - ansible.builtin.import_role:
        name: imported
  tasks:
    - include_role:
        name: included
    - block:
        - ansible.builtin.include_role:
            name: in_block
      rescue:
        - import_role: name=in_rescue
  post_tasks:
    - include_role:
        name: plain
"""
        assert self.usages(monkeypatch, {"site.yml": playbook}) == {
            "site.yml": (
                [
                    "plain",
                    "with_role_key",
                    "with_name_key",
                    "imported",
                    "included",
                    "in_block",
                    "in_rescue",
                ],
                False,
            )
        }

    def test_playbook_without_roles_is_left_out(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        assert (
            self.usages(monkeypatch, {"site.yml": "- hosts: all\n  tasks: []\n"}) == {}
        )

    def test_dynamic_role_name(self, monkeypatch: pytest.MonkeyPatch) -> None:
        playbook = """
- hosts: all
  roles:
    - known
  tasks:
    - include_role:
        name: "{{ which }}"
"""
        assert self.usages(monkeypatch, {"site.yml": playbook}) == {
            "site.yml": (["known"], True)
        }

    def test_follows_import_playbook_relative_to_the_importer(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        files = {
            "plays/site.yml": "- import_playbook: ../shared/web.yml\n",
            "shared/web.yml": "- hosts: all\n  roles: [nginx]\n",
        }
        assert self.usages(monkeypatch, files) == {
            "plays/site.yml": (["nginx"], False),
            "shared/web.yml": (["nginx"], False),
        }

    def test_follows_an_import_outside_the_subdir(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        files = {
            "infra/site.yml": "- import_playbook: ../shared/web.yml\n",
            "shared/web.yml": "- hosts: all\n  roles: [nginx]\n",
        }
        assert self.usages(monkeypatch, files, subdir="infra") == {
            "infra/site.yml": (["nginx"], False)
        }

    def test_import_cycle_ends(self, monkeypatch: pytest.MonkeyPatch) -> None:
        files = {
            "a.yml": "- import_playbook: b.yml\n- hosts: all\n  roles: [one]\n",
            "b.yml": "- import_playbook: a.yml\n- hosts: all\n  roles: [two]\n",
        }
        assert self.usages(monkeypatch, files) == {
            "a.yml": (["two", "one"], False),
            "b.yml": (["one", "two"], False),
        }

    def test_cyclic_yaml_anchor_ends(self, monkeypatch: pytest.MonkeyPatch) -> None:
        playbook = """
- hosts: all
  tasks: &tasks
    - include_role:
        name: kept
    - block: *tasks
"""
        assert self.usages(monkeypatch, {"site.yml": playbook}) == {
            "site.yml": (["kept"], False)
        }

    def test_templated_import_is_dynamic(self, monkeypatch: pytest.MonkeyPatch) -> None:
        files = {"site.yml": '- import_playbook: "{{ which }}.yml"\n'}
        assert self.usages(monkeypatch, files) == {"site.yml": ([], True)}

    def test_missing_or_broken_import_is_ignored(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        files = {
            "site.yml": (
                "- import_playbook: missing.yml\n"
                "- import_playbook: broken.yml\n"
                "- hosts: all\n  roles: [kept]\n"
            ),
            "broken.yml": "- hosts: [unclosed\n",
        }
        assert self.usages(monkeypatch, files) == {"site.yml": (["kept"], False)}
