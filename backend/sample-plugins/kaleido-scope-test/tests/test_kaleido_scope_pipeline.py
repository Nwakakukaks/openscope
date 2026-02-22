"""Tests for KaleidoScope pipeline."""

import pytest
import torch


class TestKaleidoScopePipeline:
    """Test cases for KaleidoScopePipeline."""

    def test_pipeline_init(self):
        """Test pipeline can be initialized."""
        from src.kaleido_scope.pipelines.pipeline import KaleidoScopePipeline
        
        pipeline = KaleidoScopePipeline()
        assert pipeline is not None

    def test_pipeline_prepare(self):
        """Test pipeline prepare method."""
        from src.kaleido_scope.pipelines.pipeline import KaleidoScopePipeline
        
        pipeline = KaleidoScopePipeline()
        requirements = pipeline.prepare()
        assert requirements is not None

    def test_pipeline_call(self):
        """Test pipeline can process frames."""
        from src.kaleido_scope.pipelines.pipeline import KaleidoScopePipeline
        
        pipeline = KaleidoScopePipeline()
        
        # Create dummy input frames
        frames = [torch.randint(0, 256, (1, 256, 256, 3), dtype=torch.uint8) for _ in range(2)]
        
        # Process frames
        result = pipeline(video=frames)
        
        assert "video" in result
        assert result["video"] is not None

    def test_config_class(self):
        """Test pipeline config class exists."""
        from src.kaleido_scope.pipelines.pipeline import KaleidoScopePipeline
        from src.kaleido_scope.pipelines.schema import KaleidoScopeConfig
        
        assert KaleidoScopePipeline.get_config_class() == KaleidoScopeConfig
