import re

def update_app_tsx(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Add import for useNotifications
    if 'import { useNotifications }' not in content:
        content = content.replace(
            'import { DeletedPost } from "./types";',
            'import { DeletedPost } from "./types";\nimport { useNotifications } from "./hooks/useNotifications";'
        )

    # Replace notification state variables
    content = re.sub(
        r'const \[notificationScheduled, setNotificationScheduled\] = useState\(false\);',
        '',
        content
    )
    content = re.sub(
        r'const \[notificationStatus, setNotificationStatus\] = useState<\'unknown\' \| \'granted\' \| \'denied\' \| \'unsupported\'\>\(\'unknown\'\);',
        '',
        content
    )

    # Replace state declarations with hook
    replace_text = '''  const {
    notification,
    notificationStatus,
    notificationScheduled,
    setNotificationScheduled,
    requestNotificationPermission,
    showNotification,
    scheduleNotification,
    clearNotification
  } = useNotifications();'''

    # Find the right place to insert the hook call (near other state declarations)
    content = content.replace(
        '  const [notificationScheduled, setNotificationScheduled] = useState(false);',
        replace_text
    )

    # Remove notification-related functions
    functions_to_remove = [
        'const showNotification = (message: string) => {',
        'const requestNotificationPermission = async () => {',
        'const scheduleNotification = (title: string, options?: NotificationOptions) => {'
    ]

    # Remove these functions
    for func in functions_to_remove:
        start = content.find(func)
        if start != -1:
            # Find the end of the function
            end = content.find('\n  }', start)
            if end != -1:
                content = content[:start] + content[end+3:]

    with open(file_path, 'w') as f:
        f.write(content)

update_app_tsx('/home/yutang/repos/social-media-kit/src/App.tsx')
print("App.tsx updated successfully.")