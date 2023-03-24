# Netcup Status Monitor

A Node.js script that monitors the netcup status page for status reports in selected categories and, in case of an incident, creates TeamSpeak channels with information about it.

## Installation

1. Clone the repository.
2. Build the image.
    ```
    docker build -t netcup-status-monitor .
    ```
3. Copy config.json.dist into /config/config.json.
4. Start the container by using docker run or docker-compose.
    ```
    docker run -v "./config/config.json:/usr/src/app/config.json" netcup-status-monitor
    ```

    Example docker-compose.yml:
    ```yml
    version: "3.3"

    services:
        netcup-status-monitor:
            image: netcup-status-monitor
            volumes:
              - ./config/config.json:/usr/src/app/config.json
            restart: unless-stopped
    ```

## Config
1. **TeamSpeak connection:**

    Connection details for the TeamSpeak serverquery client.

    Default:
    ```json
    "TeamspeakConnection": {
        "host": "127.0.0.1",
        "queryport": 10011,
        "serverport": 9987,
        "username": "serveradmin",
        "password": "",
        "nickname": "" // Display name for the serverquery client
    }
    ```

2. **Relevant categories:**

    Categories to be notified about incidents related to specific topics.

    Default:
    ```json
    "RelevantCategories": [
        "Netzwerk",
        "Root-Server"
    ]
    ```

3. **Site URL:**

    Web address of the status page.

    Default:
    ```json
    "SiteUrl": "https://www.netcup-status.de"
    ```

4. **Check interval:**

    The interval in which the monitor checks for incidents at netcup in milliseconds.

    Default:
    ```json
    "CheckInterval": 1800000
    ```

5. **Log incident check:**

    Adds a log entry for every performed incident check.

    Default:
    ```json
    "LogIncidentCheck": false
    ```