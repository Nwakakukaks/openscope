"""GitHub integration router."""

import base64
import os
from typing import Optional
from pydantic import BaseModel

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from github import Github
from github.GithubException import GithubException

from ..config import get_settings

router = APIRouter()


class GitHubConfig(BaseModel):
    """GitHub configuration."""

    token: str
    owner: Optional[str] = None
    repo: Optional[str] = None


class CreateRepoRequest(BaseModel):
    """Create repository request."""

    name: str
    description: str = ""
    private: bool = False
    auto_init: bool = True


class PushPluginRequest(BaseModel):
    """Push plugin to GitHub request."""

    repo_name: str
    plugin_name: str
    files: dict[str, str]  # filename -> content
    description: str = "Plugin created with OpenScope"
    private: bool = False


@router.post("/repo")
async def create_repo(request: CreateRepoRequest, settings=get_settings):
    """Create a new GitHub repository."""
    if not settings.github_token:
        raise HTTPException(status_code=401, detail="GitHub token not configured")

    try:
        g = Github(settings.github_token)
        user = g.get_user()
        repo = user.create_repo(
            request.name,
            description=request.description,
            private=request.private,
            auto_init=request.auto_init,
        )
        return {"url": repo.html_url, "name": repo.name}
    except GithubException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/push")
async def push_plugin(request: PushPluginRequest, settings=get_settings):
    """Push plugin files to GitHub."""
    if not settings.github_token:
        raise HTTPException(status_code=401, detail="GitHub token not configured")

    try:
        g = Github(settings.github_token)
        user = g.get_user()

        # Create or get repository
        try:
            repo = user.get_repo(request.repo_name)
        except GithubException:
            repo = user.create_repo(
                request.repo_name,
                description=request.description,
                private=request.private,
                auto_init=True,
            )

        # Get default branch
        branch = repo.default_branch

        # Create commit
        contents = []
        for filename, content in request.files.items():
            file_content = base64.b64encode(content.encode()).decode()
            try:
                existing = repo.get_contents(filename, ref=branch)
                contents.append(
                    repo.update_file(
                        existing.path,
                        f"Update {filename}",
                        file_content,
                        existing.sha,
                        branch=branch,
                    )
                )
            except GithubException:
                contents.append(
                    repo.create_file(
                        filename, f"Add {filename}", file_content, branch=branch
                    )
                )

        return {
            "success": True,
            "url": repo.html_url,
            "files": list(request.files.keys()),
        }
    except GithubException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos")
async def list_repos(settings=get_settings):
    """List user repositories."""
    if not settings.github_token:
        raise HTTPException(status_code=401, detail="GitHub token not configured")

    try:
        g = Github(settings.github_token)
        user = g.get_user()
        repos = user.get_repos()
        return [
            {"name": r.name, "url": r.html_url, "description": r.description}
            for r in repos
        ]
    except GithubException as e:
        raise HTTPException(status_code=400, detail=str(e))
