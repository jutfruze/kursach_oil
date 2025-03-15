
REPO_URL="git@github.com:jutfruze/kursach_oil.git"
BRANCH="main"
COMMIT_MESSAGE="Auto-commit: $(date +'%Y-%m-%d %H:%M:%S')"

# Добавляем все изменения
git add .

# Делаем коммит
git commit -m "$COMMIT_MESSAGE"

# Пушим изменения
git push $REPO_URL $BRANCH

# Проверяем результат
if [ $? -eq 0 ]; then
    echo "Изменения успешно отправлены в репозиторий!"
else
    echo "Ошибка при отправке изменений."
fi