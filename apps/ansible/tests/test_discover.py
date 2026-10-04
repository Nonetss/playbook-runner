import pytest

from app.services.git import discover as discover_module
from app.services.git.discover import discover, is_playbook


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
