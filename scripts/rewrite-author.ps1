Param(
  [string]$OldEmail = "emanzano@emt.dev",
  [string]$NewName = "ErikManzano",
  [string]$NewEmail = "erikjonathanmanzano@gmail.com",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

Write-Host "== Wolf AI author rewrite ==" -ForegroundColor Cyan
Write-Host "Old email : $OldEmail"
Write-Host "New author: $NewName <$NewEmail>"

if (-not (Test-Path ".git")) {
  throw "Run this script from the repository root."
}

$backupBranch = "backup/pre-author-rewrite-" + (Get-Date -Format "yyyyMMdd-HHmmss")
git branch $backupBranch
Write-Host "Backup branch created: $backupBranch" -ForegroundColor Yellow

$envFilter = @"
if [ "`$GIT_AUTHOR_EMAIL" = "$OldEmail" ]; then
  export GIT_AUTHOR_NAME="$NewName";
  export GIT_AUTHOR_EMAIL="$NewEmail";
fi
if [ "`$GIT_COMMITTER_EMAIL" = "$OldEmail" ]; then
  export GIT_COMMITTER_NAME="$NewName";
  export GIT_COMMITTER_EMAIL="$NewEmail";
fi
"@

git filter-branch --env-filter $envFilter --tag-name-filter cat -- --all

# Cleanup backup refs created by filter-branch
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Write-Host "Rewritten history. Force-pushing $Branch..." -ForegroundColor Yellow
git push origin --force --all
git push origin --force --tags

Write-Host "Done. Verify on GitHub commits page." -ForegroundColor Green
