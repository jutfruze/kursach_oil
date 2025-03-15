REPO_URL="git@github.com:jutfruze/kursach_oil.git"
BRANCH="main"
COMMIT_MESSAGE="Auto-commit: $(date +'%Y-%m-%d %H:%M:%S')"

git add .

git commit -m "$COMMIT_MESSAGE"

git push origin $BRANCH

if [ $? -eq 0 ]; then
    echo "Изменения успешно отправлены в репозиторий!"
else
    echo "Ошибка при отправке изменений."
fi