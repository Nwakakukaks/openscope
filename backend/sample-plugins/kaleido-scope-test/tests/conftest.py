import pytest


@pytest.fixture
def dummy_frames():
    """Provide dummy video frames for testing."""
    import torch
    # Returns a list of dummy frames (1, H, W, C) in [0, 255]
    return [torch.randint(0, 256, (1, 256, 256, 3), dtype=torch.uint8)]
