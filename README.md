# n8n Webhook Chat

<p align="center">
  <img src="icon.svg" alt="App Icon" width="128">
</p>

<p align="center">
  A sleek, modern chat application that connects to any n8n backend via webhooks. It supports text, audio recording, and file uploads, providing a versatile and beautiful interface for interacting with your custom n8n workflows.
</p>

---

## ✨ Features

- **Connect to any n8n Webhook**: Easily configure the app to point to your n8n workflow's webhook trigger.
- **Flexible Authentication**: Secure your connection with support for **Basic Auth**, **Header Auth (e.g., API Keys)**, and **JWT Bearer Tokens**.
- **Rich Media Support**:
    - 🎤 **Send**: Text, audio recordings, and any file type (images, videos, PDFs, etc.).
    - 🤖 **Receive**: Text (with full Markdown & code highlighting), images, audio, video, and downloadable files.
- **Modern & Responsive UI**: A beautiful dark-mode interface that looks and works great on both desktop and mobile devices.
- **Progressive Web App (PWA)**: Installable on your homescreen for a native app-like experience with offline support.
- **Real-time Audio Recording**: Record voice messages directly in the app with a timer and smooth visualizations.
- **Interactive Audio Player**: Listen to audio responses with a custom player that includes a waveform visualizer, playback controls, and speed adjustments.
- **Developer Friendly**: Code blocks in chat responses are beautifully rendered with syntax highlighting and a one-click copy button.
- **Persistent Settings**: Your webhook URL and authentication details are saved securely in your browser's local storage.

---

## 🚀 Getting Started

1.  **Open the App**: Launch the application in your browser.
2.  **Open Settings**: Click the **settings icon** (⚙️) in the top-right corner.
3.  **Enter Webhook URL**: Paste your n8n webhook URL into the input field.
4.  **(Optional) Configure Authentication**: Select your authentication method (`Basic`, `Header`, `JWT`) and fill in the required details.
5.  **Save & Chat**: Click "Save". The app will reload and you can start sending messages to your n8n workflow!

---

## ⚙️ n8n Workflow Configuration

This chat client sends data to your webhook as `multipart/form-data`. Your workflow should be set up to receive this.

### ⚠️ Important: Handling CORS Errors

If this chat app is hosted on a different domain than your n8n instance (which is the case for any public deployment), you will encounter a **CORS error**. Your browser's security policy will block the requests.

**To fix this**, you must configure your n8n workflow to send specific HTTP headers that tell the browser to allow these cross-domain requests.

Here’s the logic you need to add to your workflow:

1.  **Check for Preflight Request**: Right after your Webhook trigger, add an **IF node**. This node will check if the browser is sending a preliminary `OPTIONS` request (a "preflight" check).
    -   Set the condition to check if `{{ $request.method }}` is equal to `OPTIONS`.

2.  **Respond to Preflight (True Path)**:
    -   From the `true` output of the IF node, add a **Respond to Webhook** node.
    -   Configure it to send back an empty successful response with the required CORS headers:
        -   **Response Code**: `204`
        -   Under **Options** > **Response Headers**, add these headers:
            -   `Access-Control-Allow-Origin`: `*` (For better security, replace `*` with the specific URL of your chat app).
            -   `Access-Control-Allow-Methods`: `POST, OPTIONS`
            -   `Access-Control-Allow-Headers`: `*` (This allows all headers, including `Authorization`).

3.  **Add Headers to Main Responses (False Path)**:
    -   Your main workflow logic (checking for files, processing data, etc.) should connect to the `false` output of the IF node.
    -   For **every** "Respond to Webhook" node at the end of your main logic, you must also add a CORS header:
        -   Under **Options** > **Response Headers**, add this header:
            -   `Access-Control-Allow-Origin`: `*` (or your chat app's URL).

### Input Data Format

Your n8n webhook node will receive the following data:
- `text`: The text message sent by the user.
- `chatId`: A unique UUID for the current chat session.
- `file0`, `file1`, etc.: Any files attached will be available under these keys in the `Binary Data` section.

### Response Data Format

Your "Respond to Webhook" node can send data back in several formats:

#### 1. Simple Text Response

Just return a JSON object with a `text` key. Markdown is supported.

```json
{
  "text": "Hello! You said: **{{ $json.text }}**"
}
```

#### 2. Multiple/Mixed Responses

For more complex replies (e.g., text followed by an image), return a JSON object with a `responses` array. Each object in the array must have a `type` and `content`.

- `type`: Can be `text`, `image`, `audio`, `video`, or `file`.
- `content`: For `text`, this is the string. For other types, it should be the **base64 encoded** file content.
- `mimeType`: The MIME type of the file (e.g., `image/png`, `application/pdf`).

```json
{
  "responses": [
    {
      "type": "text",
      "content": "Here is the image you requested:"
    },
    {
      "type": "image",
      "content": "{{ $binary.data.data.toString('base64') }}",
      "mimeType": "{{ $binary.data.mimeType }}"
    }
  ]
}
```

#### 3. Direct File Response

To send a single file back (like a generated PDF or a ZIP archive):
1.  Read the file into n8n's binary data store (e.g., using a "Read Binary File" node).
2.  In the "Respond to Webhook" node:
    - Set **Response Data** to `File`.
    - Set **Source** to `Binary Data`.
    - Set **Property Name** to the property holding your binary data (e.g., `data`).
    - **Important**: Set a `Content-Disposition` header to provide a filename. Example: `attachment; filename="report.pdf"`

### Example n8n Workflow (with CORS Fix)

Here is the simple "Echo Bot" workflow, now updated with the necessary nodes and headers to handle CORS correctly. You can copy and paste this into your n8n canvas.

```json
{
  "name": "Webhook Chat Echo Bot (with CORS)",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "webhook-chat-demo",
        "options": {
          "binaryData": true
        }
      },
      "id": "52853a84-18c7-4b7f-a128-40b543d3b733",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [
        860,
        380
      ],
      "webhookId": "your-webhook-id-here"
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "{{$binary.file0}}",
              "operation": "isEmpty"
            }
          ]
        }
      },
      "id": "f516d252-8706-4b8c-b630-9b48f583f7a1",
      "name": "Has a file?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [
        1320,
        380
      ]
    },
    {
      "parameters": {
        "responseCode": 200,
        "responseData": "json",
        "options": {
          "responseHeaders": {
            "header": [
              {
                "name": "Access-Control-Allow-Origin",
                "value": "*"
              }
            ]
          },
          "response": "={{ { \"text\": \"You said: `\" + $json.text + \"`\" } }}"
        }
      },
      "id": "402c0190-6756-4299-974a-43183574d39f",
      "name": "Respond with Text",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [
        1560,
        480
      ]
    },
    {
      "parameters": {
        "responseCode": 200,
        "responseData": "json",
        "options": {
          "responseHeaders": {
            "header": [
              {
                "name": "Access-Control-Allow-Origin",
                "value": "*"
              }
            ]
          },
          "response": "={{ { \"responses\": [ { \"type\": \"text\", \"content\": \"Here is the file you sent me back:\" }, { \"type\": \"image\", \"content\": $binary.file0.data.toString('base64'), \"mimeType\": $binary.file0.mimeType } ] } }}"
        }
      },
      "id": "e3056a29-b68a-4931-8919-4b68427f7142",
      "name": "Respond with File",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [
        1560,
        280
      ]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "{{ $request.method }}",
              "operation": "equal",
              "value2": "OPTIONS"
            }
          ]
        }
      },
      "id": "2a7b8f9e-a1c2-4d5e-b6f7-c8d9e0f1a2b3",
      "name": "Check for OPTIONS",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [
        1080,
        380
      ]
    },
    {
      "parameters": {
        "responseCode": 204,
        "options": {
          "responseHeaders": {
            "header": [
              {
                "name": "Access-Control-Allow-Origin",
                "value": "*"
              },
              {
                "name": "Access-Control-Allow-Methods",
                "value": "POST, OPTIONS"
              },
              {
                "name": "Access-Control-Allow-Headers",
                "value": "*"
              }
            ]
          }
        }
      },
      "id": "c4d5e6f7-a8b9-4c1d-b2e3-f4a5b6c7d8e9",
      "name": "Respond to Preflight",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [
        1320,
        180
      ]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Check for OPTIONS",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Has a file?": {
      "main": [
        [
          {
            "node": "Respond with Text",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Respond with File",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Check for OPTIONS": {
      "main": [
        [
          {
            "node": "Respond to Preflight",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Has a file?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

### Installation & Setup

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/JeyaramKumaravel/n8n-webhook-chat.git
    cd n8n-webhook-chat
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Run the Development Server**
    ```bash
    npm run dev
    ```
    The application will be running at `http://localhost:3000` (or the next available port).

---

## 🛠️ Configuration for Public Access
If you need to expose your local development server to the internet using a service like Cloudflare Tunnel, you must add the tunnel's hostname to Vite's list of allowed hosts.
- Open the vite.config.js (or vite.config.ts) file located in the root of your project.
- Add a server object to your configuration and include the allowedHosts property with the specified URL. This tells Vite to trust requests coming from that domain.

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // or your framework plugin

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // This block allows connections
    allowedHosts: [
      'Paste/here/your/host/name',
    ],
  },
});

```
## 🔧 Available Scripts

- **Start development server**
  ```bash
  npm run dev
  ```
- **Build for production**
  ```bash
  npm run build
  ```
- **Start production server**
  ```bash
  npm run preview
  ```
    
---

## 🛠️ Tech Stack

- **Framework**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Offline/PWA**: Service Worker API
- **Module Loading**: ES Modules with Import Maps (no build step required!)

---

## License

This project is licensed under the MIT License.
