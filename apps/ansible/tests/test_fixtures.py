import re
from pathlib import Path

from app.core.config import settings
from app.services.git.mirror import mirror_path


def test_settings_point_into_tmp_path(tmp_path: Path) -> None:
    assert Path(settings.run_scratch_dir).is_relative_to(tmp_path)
    assert Path(settings.state_dir).is_relative_to(tmp_path)


def test_git_mirror_fixture(git_mirror) -> None:
    assert re.fullmatch(r"[0-9a-f]{40}", git_mirror.commit)
    assert mirror_path(git_mirror.repository_id).is_dir()
