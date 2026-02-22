"""Tests for YoloMask pipeline."""

import pytest
import torch


class TestYoloMaskPipeline:
    """Test cases for YoloMaskPipeline."""

    def test_pipeline_init(self):
        """Test pipeline can be initialized."""
        from src.yolo_mask.pipelines.pipeline import YoloMaskPipeline
        
        pipeline = YoloMaskPipeline()
        assert pipeline is not None

    def test_pipeline_prepare(self):
        """Test pipeline prepare method."""
        from src.yolo_mask.pipelines.pipeline import YoloMaskPipeline
        
        pipeline = YoloMaskPipeline()
        requirements = pipeline.prepare()
        assert requirements is not None

    def test_pipeline_call(self):
        """Test pipeline can process frames."""
        from src.yolo_mask.pipelines.pipeline import YoloMaskPipeline
        
        pipeline = YoloMaskPipeline()
        
        # Create dummy input frames
        frames = [torch.randint(0, 256, (1, 256, 256, 3), dtype=torch.uint8) for _ in range(2)]
        
        # Process frames
        result = pipeline(video=frames)
        
        assert "video" in result
        assert result["video"] is not None

    def test_config_class(self):
        """Test pipeline config class exists."""
        from src.yolo_mask.pipelines.pipeline import YoloMaskPipeline
        from src.yolo_mask.pipelines.schema import YoloMaskConfig
        
        assert YoloMaskPipeline.get_config_class() == YoloMaskConfig
