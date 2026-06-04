# baholAI + Ollama (mahalliy LLM)

baholAI ochiq javoblarni (qisqa javob, insho) **mahalliy LLM** orqali baholaydi.
Ollama ishlamasa, avtomatik **qoidaviy fallback**ga o'tadi (demo baribir ishlaydi).

## O'rnatish (sudosiz, userspace)

```bash
# 1. Binarni yuklab olish (CPU bundle)
curl -fSL https://github.com/ollama/ollama/releases/download/v0.30.4/ollama-linux-amd64.tar.zst -o /tmp/ollama.tar.zst

# 2. ~/.local ga ochish (bin/ va lib/ shu yerga tushadi)
mkdir -p ~/.local && zstd -dc /tmp/ollama.tar.zst | tar -x -C ~/.local

# 3. Serverni ishga tushirish
~/.local/bin/ollama serve &        # http://localhost:11434

# 4. Model va baholAI uchun maxsus model
~/.local/bin/ollama pull qwen2.5:3b
~/.local/bin/ollama create baholai -f baholai.Modelfile
```

## baholAI ni ulash

`backend/.env`:
```
AI_ENABLED=true
OLLAMA_URL=http://localhost:11434
AI_MODEL=baholai          # yoki to'g'ridan-to'g'ri qwen2.5:3b
```
So'ng backendni qayta ishga tushiring. Tekshirish: `GET /api/ai/status` → `"provider":"ollama"`.

> Tizimda root bo'lsa, rasmiy yo'l ham bor: `curl -fsSL https://ollama.com/install.sh | sh`.
