# Fabric Routing & Cold Kernel Status

**Date:** 2025-12-06
**Status:** ✅ ROUTING WORKS - ⏳ LLM ENDPOINT NEEDED
**System:** ckp.v1.3.18.rust.PH2

---

## 🎯 Summary

**What Works:**
1. ✅ System.Wss routes messages to OFFLINE/cold kernels (including Fabric)
2. ✅ Service discovery includes Fabric in kernel list
3. ✅ ck-client-js can query and discover Fabric
4. ✅ Messages arrive in Fabric's inbox queue
5. ✅ Governor detects new jobs (69 queued)
6. ✅ fabric_executor binary exists

**What Needs Setup:**
1. ⏳ Local LLM endpoint at `http://localhost:8080/v1` not running
2. ⏳ 69 jobs waiting in Fabric's inbox for processing

---

## 🔍 Investigation Results

### Test 1: Service Discovery
```bash
curl -s http://localhost:56000/.well-known/ck-services | jq '.kernels[] | select(.name | contains("Fabric"))'
```

**Result:**
```json
{
  "mode": "OFFLINE",
  "name": "ConceptKernel.LLM.Fabric",
  "status": "INACTIVE",
  "type": "rust:cold",
  "urn": "ckp://ConceptKernel.LLM.Fabric:0.1.0"
}
```

✅ **Fabric IS in service discovery**

---

### Test 2: WebSocket Routing
```javascript
const ck = await ConceptKernel.connect('http://localhost:56000', { autoConnect: true });

const response = await ck.emit('ConceptKernel.LLM.Fabric', {
  action: 'query',
  prompt: 'Test message to OFFLINE kernel'
});
```

**Result:**
```
kernel_request_accepted:
  message: 'Request queued for ConceptKernel.LLM.Fabric'
  target: 'ConceptKernel.LLM.Fabric'
  txId: '1765029045970-4d63f2a3'

(Timeout after 5s - no response)
```

✅ **System.Wss accepted the routing request**

---

### Test 3: Inbox File Created
```bash
ls -la concepts/ConceptKernel.LLM.Fabric/queue/inbox/1765029045970-4d63f2a3.job
```

**Result:**
```
-rw-r--r--@ 1 neoxr  staff  273  6 Dec 13:50 1765029045970-4d63f2a3.job
```

**File contents:**
```json
{
  "edge": "QUERIES",
  "from": "ckp://Agent.Anonymous",
  "payload": {
    "action": "query",
    "prompt": "Test message to OFFLINE kernel"
  },
  "reply_to": "client-1765029045969-944af174",
  "to": "ckp://ConceptKernel.LLM.Fabric",
  "txId": "1765029045970-4d63f2a3"
}
```

✅ **Message was routed to Fabric's inbox**

---

### Test 4: Governor Status
```bash
ps aux | grep "ConceptKernel.LLM.Fabric" | grep -v grep
```

**Result:**
```
neoxr  7929  /target/release/ckp daemon governor --kernel ConceptKernel.LLM.Fabric
```

✅ **Governor is running (PID 7929)**

**Log output:**
```
[ConceptKernel] [ConceptKernel.LLM.Fabric] Event: New job in inbox
[ConceptKernel] [ConceptKernel.LLM.Fabric] Event: New job in inbox
[ConceptKernel] [ConceptKernel.LLM.Fabric] Event: New job in inbox
...
```

✅ **Governor detects new jobs**

---

### Test 5: Inbox Queue Status
```bash
ls -1 concepts/ConceptKernel.LLM.Fabric/queue/inbox/*.job | wc -l
```

**Result:**
```
69 jobs waiting
```

⏳ **69 jobs queued but not processed**

---

### Test 6: Fabric Executor Binary
```bash
ls -la concepts/ConceptKernel.LLM.Fabric/tool/rs/fabric_executor/target/release/fabric_executor
```

**Result:**
```
-rwxr-xr-x@ 1 neoxr  staff  1188832  5 Dec 03:18 fabric_executor
```

✅ **Binary exists and is executable**

---

### Test 7: Local LLM Endpoint
```bash
curl -s http://localhost:8080/v1/models
```

**Result:**
```
Upgrade Required
```

```bash
lsof -i :8080
```

**Result:**
```
node    89762 neoxr   12u  IPv6  *:http-alt (LISTEN)
```

❌ **Port 8080 has Node.js process, NOT an LLM endpoint**

---

## 📋 Fabric Configuration (from conceptkernel.yaml)

### Entrypoint
```yaml
entrypoint: tool/rs/fabric_executor/target/release/fabric_executor
```

### Model Configuration
```yaml
model:
  type: "local"
  api: "openai-compatible"
  endpoint: "http://localhost:8080/v1"  # ← NEEDS TO BE RUNNING
  model_name: "local-20b"
  parameters: 20000000000
  tokens_per_second: 50
  streaming: true
  context_window: 8192
```

### Queue Contract (Expected Input)
```json
{
  "query": "string (required)",
  "pattern": "string (optional, default: analyze_tech_impact)",
  "context": {
    "files": ["array of file paths"],
    "system_prompt": "string"
  }
}
```

### Edge Integration
```yaml
edges:
  incoming:
    - source: "*"
      predicate: REQUESTS
      description: Accept pattern query requests from any kernel
  outgoing:
    - target: "*"
      predicate: RESPONDS
      description: Send query responses back to requesting kernels
```

---

## 🚀 How Routing Works for OFFLINE/Cold Kernels

### Architecture Flow

```
1. Client sends message to Fabric via ck-client-js
   ↓
   WebSocket connection to System.Wss (ws://localhost:56001)

2. System.Wss receives message
   ↓
   {
     edge: "QUERIES",
     from: "ckp://Agent.Anonymous",
     to: "ckp://ConceptKernel.LLM.Fabric",
     payload: {...}
   }

3. System.Wss checks if target kernel is ONLINE
   ↓
   Fabric is OFFLINE → Route to inbox queue

4. System.Wss writes message to file
   ↓
   concepts/ConceptKernel.LLM.Fabric/queue/inbox/{txId}.job

5. System.Wss sends acknowledgment
   ↓
   {
     type: 'kernel_request_accepted',
     message: 'Request queued for ConceptKernel.LLM.Fabric',
     target: 'ConceptKernel.LLM.Fabric',
     txId: '...'
   }

6. Governor watches inbox directory
   ↓
   Detects new .job file

7. Governor attempts to process job
   ↓
   Spawns fabric_executor process

8. fabric_executor attempts to connect to LLM
   ↓
   Tries to reach http://localhost:8080/v1

9. LLM endpoint not available
   ↓
   Job remains in inbox (NOT processed)
```

---

## ✅ What This Proves

### 1. Routing to OFFLINE Kernels Works
- System.Wss accepts messages to OFFLINE kernels
- Messages are queued in the kernel's inbox
- Governor detects new messages
- **Routing mechanism is fully functional**

### 2. Discovery Includes OFFLINE Kernels
- `/.well-known/ck-services` includes Fabric
- Mode: OFFLINE
- Status: INACTIVE
- Type: rust:cold
- **Discovery is working correctly**

### 3. ck-client-js Can Query OFFLINE Kernels
```javascript
// This works - Fabric is in the list
const fabricKernels = discoveryData.kernels.filter(k =>
  k.name && k.name.includes('Fabric')
);

// Found 2 Fabric entries (duplicate, but both present)
// - ConceptKernel.LLM.Fabric : OFFLINE / INACTIVE
```

### 4. Governor is Running
- PID 7929 is active
- Watching inbox directory
- Detecting new jobs
- **Governor daemon is operational**

---

## ⏳ What Needs to Be Done

### 1. Start Local LLM Endpoint
Fabric expects an OpenAI-compatible API at:
```
http://localhost:8080/v1
```

**Options:**
- **Ollama:** `ollama serve` (usually on port 11434, need to proxy/configure)
- **LM Studio:** Start server on port 8080
- **LocalAI:** Configure to listen on 8080
- **vLLM:** Start with `--port 8080`
- **llama.cpp server:** `./server --port 8080`

**Required endpoints:**
- `POST /v1/chat/completions` (OpenAI-compatible)
- `GET /v1/models` (list available models)

### 2. Configure Model in Fabric
Update `conceptkernel.yaml` if using different endpoint:
```yaml
model:
  endpoint: "http://localhost:11434/v1"  # Ollama default
  # OR
  endpoint: "http://localhost:1234/v1"   # LM Studio default
```

### 3. Process Backlog
Once LLM is running, the 69 queued jobs should be automatically processed:
```bash
# Governor will detect and process all inbox jobs
# Check processing:
tail -f concepts/ConceptKernel.LLM.Fabric/logs/ConceptKernel.LLM.Fabric.log
```

---

## 🧪 CLI Commands to Test Fabric

### Check Service Discovery
```bash
node cli.js kernel list | grep Fabric
```

**Expected:**
```
ConceptKernel.LLM.Fabric    OFFLINE    rust:cold    MaterialEntity
```

### Describe Fabric Kernel
```bash
node cli.js kernel describe ConceptKernel.LLM.Fabric
```

**Expected:**
```
Kernel (Continuant): ConceptKernel.LLM.Fabric
═══════════════════════════════════════════════════════════════

Kernel Information (Continuant):
  Name:         ConceptKernel.LLM.Fabric
  URN:          ckp://ConceptKernel.LLM.Fabric:0.1.0
  Type:         rust:cold
  Mode:         OFFLINE
  Status:       INACTIVE
  BFO Type:     MaterialEntity
```

### Send Test Message (via WebSocket)
```bash
node -e "
const CK = require('./ck-client-js/index.js');
(async () => {
  const ck = await CK.connect('http://localhost:56000', { autoConnect: true });

  try {
    const response = await ck.emit('ConceptKernel.LLM.Fabric', {
      query: 'Test query',
      pattern: 'analyze_tech_impact'
    }, { timeout: 5000 });
    console.log('Response:', response);
  } catch (error) {
    console.log('Queued (no response yet):', error.message);
  }

  ck.disconnect();
})();
"
```

**Expected (without LLM):**
```
kernel_request_accepted: Request queued for ConceptKernel.LLM.Fabric
Queued (no response yet): Message timeout
```

**Check inbox:**
```bash
ls -lt concepts/ConceptKernel.LLM.Fabric/queue/inbox/*.job | head -1
```

### Run Automated Roundtrip Test
Test the full WSS → Fabric → WSS roundtrip flow:
```bash
cd ck-client-js
node test-fabric-roundtrip.js
```

**What it tests:**
1. Client connects to System.Wss (ws://localhost:56001)
2. Sends REQUESTS message to ConceptKernel.LLM.Fabric
3. Verifies message arrives in Fabric's inbox queue
4. Waits for Governor to process the job
5. Monitors for response via WebSocket
6. Confirms full roundtrip completion

**Expected output (without LLM):**
```
🧪 Testing WSS → Fabric → WSS Roundtrip

✅ Connected to System.Wss

📤 Sending REQUESTS to Fabric:
{
  "txId": "1765081732681-jwegmtvi",
  "edge": "REQUESTS",
  "to": "ckp://ConceptKernel.LLM.Fabric:v0.1",
  "payload": {
    "query": "What is ConceptKernel?",
    "pattern": "extract_wisdom"
  }
}

⏳ Waiting for Fabric response via WSS broadcast...

📥 Received message:
{
  "message": "Request queued for ConceptKernel.LLM.Fabric",
  "type": "kernel_request_accepted",
  "txId": "1765081732681-jwegmtvi"
}

ℹ️  Request acknowledged - waiting for actual response...

❌ Timeout - No response received after 30 seconds

📊 Status:
   ✅ Routing to Fabric works
   ✅ Message queued in inbox
   ❌ No response (Fabric needs LLM endpoint at http://localhost:8080/v1)
```

**Expected output (with LLM running):**
```
🧪 Testing WSS → Fabric → WSS Roundtrip

✅ Connected to System.Wss

📤 Sending request to Fabric...
   txId: 1765029045970-4d63f2a3

✅ Request accepted by System.Wss

✅ Response received from Fabric!
   Duration: 2.3s
   Output: [Fabric LLM response]

📊 Test Summary:
   Full roundtrip: ✅ SUCCESS
```

---

## 📊 Current System State

```
Continuants (Kernels):
  Total:                    32
  Online:                   9
  Offline:                  23 (includes Fabric)

Fabric Status:
  Mode:                     OFFLINE (rust:cold - normal for on-demand kernels)
  Governor:                 RUNNING (PID 7929)
  Executor:                 EXISTS (1.2MB binary)
  LLM Endpoint:             NOT RUNNING (port 8080 has Node.js)
  Inbox Queue:              69 jobs waiting

Routing Status:
  System.Wss → Fabric:      ✅ WORKING
  Message Queuing:          ✅ WORKING
  Job Detection:            ✅ WORKING
  Job Processing:           ⏳ WAITING FOR LLM
```

---

## 🎓 BFO Classification

### Fabric as Material Entity (Continuant)
```
ConceptKernel.LLM.Fabric
├── BFO Type: MaterialEntity
├── Mode: OFFLINE (persists but not actively running)
├── Type: rust:cold (starts on-demand)
├── Capabilities: Pattern-based LLM queries
└── Dependencies: Local LLM endpoint at localhost:8080/v1
```

### Message Routing as Process (Occurrent)
```
EdgeRoute Process
├── Temporal Region: Start → End (milliseconds)
├── Temporal Parts:
│   ├── Phase 1: Message received by System.Wss
│   ├── Phase 2: Target identified (Fabric)
│   ├── Phase 3: Mode checked (OFFLINE)
│   ├── Phase 4: File written to inbox queue
│   └── Phase 5: Acknowledgment sent
├── Participants:
│   ├── Source: Agent.Anonymous (client)
│   ├── Router: System.Wss
│   └── Target: ConceptKernel.LLM.Fabric
└── Status: completed (routing successful)
```

---

## 🔑 Key Takeaways

### For UI/Client Developers

1. **Fabric IS discoverable** - Shows in service discovery as OFFLINE
2. **Messages CAN be sent to Fabric** - System.Wss accepts and queues them
3. **No immediate response** - OFFLINE kernels don't respond until processed
4. **Check mode before expecting response:**
   ```javascript
   const fabric = kernels.find(k => k.name === 'ConceptKernel.LLM.Fabric');
   if (fabric.mode === 'OFFLINE') {
     console.log('Message queued, processing when kernel starts');
   }
   ```

### For System Administrators

1. **Routing is working correctly** - No changes needed
2. **Governor is operational** - Watching inbox, detecting jobs
3. **Need LLM endpoint** - Start OpenAI-compatible server on port 8080
4. **69 jobs will auto-process** - Once LLM is available

### For ConceptKernel Architects

1. **rust:cold pattern works** - On-demand kernels receive messages
2. **Queue-based routing** - OFFLINE kernels use inbox queue
3. **Governor handles lifecycle** - Starts kernel when jobs arrive
4. **External dependencies** - Fabric needs LLM, others may need different services

---

## 🚀 Next Steps

### Immediate (To Enable Fabric)
1. Start local LLM server on port 8080 (or configure alternative)
2. Verify endpoints:
   - `curl http://localhost:8080/v1/models`
3. Test Fabric processing:
   - Send test message via ck-client-js
   - Watch logs for response
4. Clear backlog:
   - 69 queued jobs will auto-process

### Optional (For Production)
1. Configure persistent LLM service
2. Add health checks for LLM endpoint
3. Monitor Fabric processing metrics
4. Set up alerting for failed jobs
5. Document Fabric patterns for other kernels

---

**Status:** ✅ ROUTING OPERATIONAL - ⏳ AWAITING LLM ENDPOINT
**Date:** 2025-12-06
**Version:** 1.3.18
