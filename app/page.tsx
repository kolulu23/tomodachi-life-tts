'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioLines,
  Download,
  LoaderCircle,
  Play,
  RotateCcw,
  Shuffle,
  Square,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  controls,
  defaults,
  languages,
  presets,
  validateRequest,
  validateSettings,
} from '@/public/engine/config.js';
import { VoiceClient } from '@/lib/voice/client';
import type {
  SpeechRequest,
  SpeechResult,
  VoiceSettings,
} from '@/lib/voice/types';

type Clip = SpeechResult & { url: string; dryUrl: string; signature: string };
type SavedPreset = { name: string; settings: VoiceSettings };
const initial: SpeechRequest = {
  text: languages[0].sample,
  language: 'en-us',
  settings: { ...defaults },
};
function download(data: Blob, name: string) {
  const url = URL.createObjectURL(data),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Waveform({ samples }: { samples: Float32Array }) {
  const bars = Array.from({ length: 140 }, (_, i) => {
    let peak = 0;
    const start = Math.floor((i * samples.length) / 140),
      end = Math.floor(((i + 1) * samples.length) / 140);
    for (let j = start; j < end; j++)
      peak = Math.max(peak, Math.abs(samples[j]));
    return peak;
  });
  return (
    <svg
      viewBox="0 0 560 70"
      role="img"
      aria-label="Waveform of the generated voice"
      className="waveform"
    >
      <line x1="0" y1="35" x2="560" y2="35" stroke="#dce5e1" />
      {bars.map((p, i) => (
        <line
          key={i}
          x1={i * 4 + 2}
          x2={i * 4 + 2}
          y1={35 - Math.max(1, p * 33)}
          y2={35 + Math.max(1, p * 33)}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
export default function Home() {
  const [request, setRequest] = useState<SpeechRequest>(initial);
  const [selected, setSelected] = useState('islander');
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'working' | 'error'
  >('loading');
  const [message, setMessage] = useState(
    'Loading speech data (24 MB, once per browser cache)…',
  );
  const [error, setError] = useState('');
  const [clip, setClip] = useState<Clip | null>(null);
  const [saved, setSaved] = useState<SavedPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const client = useRef<VoiceClient | null>(null),
    clipRef = useRef<Clip | null>(null),
    mounted = useRef(false),
    run = useRef(0);
  const wetAudio = useRef<HTMLAudioElement>(null),
    dryAudio = useRef<HTMLAudioElement>(null);
  const current = useRef(request);
  current.current = request;
  const statusRef = useRef(status);
  statusRef.current = status;
  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    setMessage('Loading speech data (24 MB, once per browser cache)…');
    client.current ??= new VoiceClient();
    try {
      await client.current.init();
      if (mounted.current) {
        setStatus('ready');
        setMessage('Speech engine ready · audio stays on this device');
      }
    } catch (e) {
      if (mounted.current) {
        setStatus('error');
        setError((e as Error).message);
      }
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void load();
    try {
      const data = JSON.parse(
        localStorage.getItem('island-presets-v1') || '[]',
      );
      if (Array.isArray(data))
        setSaved(
          data
            .slice(0, 32)
            .filter((p) => typeof p?.name === 'string')
            .map((p) => ({
              name: p.name.slice(0, 40),
              settings: validateSettings(p.settings) as VoiceSettings,
            })),
        );
    } catch {
      /* A corrupt local preference must not block synthesis. */
    }
    return () => {
      mounted.current = false;
      run.current++;
      client.current?.dispose();
      if (clipRef.current) {
        URL.revokeObjectURL(clipRef.current.url);
        URL.revokeObjectURL(clipRef.current.dryUrl);
      }
    };
  }, [load]);
  const generate = useCallback(
    async (input: SpeechRequest = current.current) => {
      if (statusRef.current === 'working' || statusRef.current === 'loading')
        throw new Error('Wait for the current operation to finish.');
      const validated = validateRequest(input) as SpeechRequest;
      const token = ++run.current;
      statusRef.current = 'working';
      setStatus('working');
      setError('');
      setMessage('Synthesizing and shaping your voice…');
      wetAudio.current?.pause();
      dryAudio.current?.pause();
      try {
        client.current ??= new VoiceClient();
        const result = await client.current.generate(validated);
        if (!mounted.current || token !== run.current)
          throw new Error('Generation cancelled.');
        const next = {
          ...result,
          url: URL.createObjectURL(
            new Blob([result.wav], { type: 'audio/wav' }),
          ),
          dryUrl: URL.createObjectURL(
            new Blob([result.dryWav], { type: 'audio/wav' }),
          ),
          signature: JSON.stringify(validated),
        };
        if (clipRef.current) {
          URL.revokeObjectURL(clipRef.current.url);
          URL.revokeObjectURL(clipRef.current.dryUrl);
        }
        clipRef.current = next;
        setClip(next);
        setStatus('ready');
        setMessage('Voice generated. Press play to listen.');
        return {
          durationSeconds: result.samples.length / result.sampleRate,
          sampleRate: result.sampleRate,
          phonemes: result.phonemes,
        };
      } catch (e) {
        if (mounted.current && token === run.current) {
          setStatus('ready');
          setError((e as Error).message);
          setMessage('Ready to try again.');
        }
        throw e;
      }
    },
    [],
  );
  const generateRef = useRef(generate);
  generateRef.current = generate;
  useEffect(() => {
    type Tool = {
      name: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    };
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const life = new AbortController();
    const tools: Tool[] = [
      {
        name: 'configure_island_voice',
        description:
          'Set the visible text, language, and voice controls. Does not generate audio.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 1000 },
            language: { type: 'string', enum: languages.map((l) => l.id) },
            settings: {
              type: 'object',
              properties: Object.fromEntries(
                controls.map((c) => [
                  c.key,
                  { type: 'number', minimum: c.min, maximum: c.max },
                ]),
              ),
            },
          },
          required: ['text', 'language', 'settings'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute(input) {
          const value = validateRequest(input) as SpeechRequest;
          current.current = value;
          setRequest(value);
          setSelected('custom');
          return { configured: true, ...value };
        },
      },
      {
        name: 'generate_island_voice',
        description:
          'Generate a downloadable audio clip from the current visible voice settings. Does not autoplay.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: () => generateRef.current(),
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: life.signal }),
        ).catch(() => {});
      } catch {
        /* Optional API. */
      }
    }
    return () => life.abort();
  }, []);
  function update(key: string, value: number) {
    setRequest((r) => ({ ...r, settings: { ...r.settings, [key]: value } }));
    setSelected('custom');
  }
  function applyPreset(settings: VoiceSettings, id: string) {
    setRequest((r) => ({ ...r, settings: { ...settings } }));
    setSelected(id);
    setError('');
  }
  function savePreset() {
    const name = presetName.trim();
    if (!name) {
      setError('Give your preset a name first.');
      return;
    }
    if (saved.length >= 32 && !saved.some((p) => p.name === name)) {
      setError('You can save up to 32 presets on this device.');
      return;
    }
    const next = [
      ...saved.filter((p) => p.name !== name),
      { name, settings: { ...request.settings } },
    ];
    try {
      localStorage.setItem('island-presets-v1', JSON.stringify(next));
      setSaved(next);
      setPresetName('');
      setMessage(`Saved “${name}” on this device.`);
      setError('');
    } catch {
      setError(
        'Browser storage is unavailable. Export the preset as a file instead.',
      );
    }
  }
  async function importPreset(file: File) {
    try {
      if (file.size > 20000) throw new Error('Preset file is too large.');
      const parsed = JSON.parse(await file.text());
      if (parsed.version !== 1) throw new Error('Unsupported preset format.');
      applyPreset(validateSettings(parsed.settings) as VoiceSettings, 'custom');
      setMessage(
        `Imported ${typeof parsed.name === 'string' ? parsed.name.slice(0, 40) : 'voice preset'}.`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const language = languages.find((l) => l.id === request.language)!;
  const stale =
    clip &&
    clip.signature !==
      JSON.stringify({ ...request, text: request.text.trim() });
  return (
    <main className="shell">
      <header>
        <div className="brand">
          <AudioLines />
          <h1>Island Voice Lab</h1>
          <span className="badge">WORKBENCH</span>
        </div>
        <span className="muted">Tomodachi-inspired speech</span>
      </header>
      <div className="workspace">
        <div className="left-column">
          <section className="panel">
            <div className="section-heading">
              <h2>Give your character a voice</h2>
              <span className="step">01</span>
            </div>
            <div className="language-row">
              <div className="language-field">
                <label id="language-label">Language & pronunciation</label>
                <Select
                  value={request.language}
                  onValueChange={(v) =>
                    v && setRequest((r) => ({ ...r, language: v }))
                  }
                >
                  <SelectTrigger
                    aria-labelledby="language-label"
                    className="language-select"
                  >
                    <SelectValue>{language.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button
                className="quiet"
                onClick={() =>
                  setRequest((r) => ({ ...r, text: language.sample }))
                }
              >
                Use sample text
              </button>
            </div>
            <div className="text-label">
              <label htmlFor="speech">Text to speak</label>
              <span className="muted">{request.text.length} / 1,000</span>
            </div>
            <textarea
              id="speech"
              maxLength={1000}
              value={request.text}
              onChange={(e) =>
                setRequest((r) => ({ ...r, text: e.target.value }))
              }
              spellCheck={false}
            />
            {(request.language === 'cmn' || request.language === 'yue') && (
              <p className="language-note">
                Chinese characters supported. Keep intonation above zero to help
                preserve lexical tones. Pronunciation is deliberately synthetic.
              </p>
            )}
            <div className="actions">
              <button
                className="primary"
                disabled={
                  status === 'loading' ||
                  status === 'working' ||
                  status === 'error' ||
                  !request.text.trim()
                }
                onClick={() =>
                  void generate().catch((e) => setError(e.message))
                }
              >
                {status === 'working' ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Play size={16} />
                )}{' '}
                {status === 'working' ? 'Generating…' : 'Generate voice'}
              </button>
              {(status === 'working' || status === 'loading') && (
                <button
                  className="quiet"
                  onClick={() => {
                    run.current++;
                    client.current?.dispose();
                    setStatus('error');
                    setError('Operation cancelled. Retry when you’re ready.');
                  }}
                >
                  <Square size={14} /> Cancel
                </button>
              )}
              {status === 'error' && (
                <button className="quiet" onClick={() => void load()}>
                  Retry engine
                </button>
              )}
            </div>
            <p role="status" className="engine-status">
              <span
                className={`status-dot ${status === 'ready' ? 'ready' : ''}`}
              />
              {message}
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </section>
          <section className="panel">
            <div className="section-heading">
              <h2>Listen & export</h2>
              <span className="step">02</span>
            </div>
            {clip ? (
              <>
                <div className="clip-meta">
                  <span>
                    {(clip.samples.length / clip.sampleRate).toFixed(2)} sec ·{' '}
                    {clip.sampleRate.toLocaleString()} Hz · WAV
                  </span>
                  {stale && (
                    <span className="changed">
                      Settings changed · regenerate
                    </span>
                  )}
                </div>
                <Waveform samples={clip.samples} />
                <label htmlFor="wet-audio">Your shaped voice</label>
                <audio
                  id="wet-audio"
                  ref={wetAudio}
                  controls
                  src={clip.url}
                  onPlay={() => dryAudio.current?.pause()}
                />
                <div className="download-row">
                  <a
                    className="download"
                    href={clip.url}
                    download="island-voice.wav"
                  >
                    <Download size={15} /> Download WAV
                  </a>
                </div>
                <details>
                  <summary>Compare before effects</summary>
                  <p className="muted">
                    Same pitch, formants and speech settings, with the effects
                    section bypassed.
                  </p>
                  <audio
                    aria-label="Voice before effects"
                    ref={dryAudio}
                    controls
                    src={clip.dryUrl}
                    onPlay={() => wetAudio.current?.pause()}
                  />
                  <a
                    className="download"
                    href={clip.dryUrl}
                    download="island-voice-dry.wav"
                  >
                    Download before effects
                  </a>
                </details>
                <details>
                  <summary>Phoneme trace</summary>
                  <pre className="phonemes">{clip.phonemes}</pre>
                </details>
              </>
            ) : (
              <div className="empty-audio">
                <AudioLines size={28} />
                <p>Your voice will appear here.</p>
                <span className="muted">
                  Generate a clip to listen, compare, and download.
                </span>
              </div>
            )}
          </section>
          <section className="panel">
            <div className="section-heading">
              <h2>Character presets</h2>
              <button
                className="quiet"
                onClick={() => {
                  const p = presets[Math.floor(Math.random() * presets.length)];
                  applyPreset(p.settings, p.id);
                }}
              >
                <Shuffle size={15} /> Surprise me
              </button>
            </div>
            <div className="presets">
              {presets.map((p) => (
                <button
                  key={p.id}
                  aria-pressed={selected === p.id}
                  className={`preset ${selected === p.id ? 'active' : ''}`}
                  onClick={() => applyPreset(p.settings, p.id)}
                >
                  <span>{p.name}</span>
                  <small>{p.description}</small>
                </button>
              ))}
            </div>
            <details className="saved-presets">
              <summary>
                Your presets{' '}
                <span className="muted">· saved on this device</span>
              </summary>
              <div className="save-row">
                <input
                  aria-label="Preset name"
                  placeholder="Name this voice"
                  maxLength={40}
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                />
                <button className="secondary" onClick={savePreset}>
                  Save
                </button>
              </div>
              {saved.length > 0 && (
                <div className="custom-list">
                  {saved.map((p) => (
                    <button
                      key={p.name}
                      className="preset"
                      onClick={() => applyPreset(p.settings, `saved:${p.name}`)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="preset-files">
                <button
                  className="quiet"
                  onClick={() =>
                    download(
                      new Blob(
                        [
                          JSON.stringify(
                            {
                              version: 1,
                              name:
                                presetName ||
                                presets.find((p) => p.id === selected)?.name ||
                                'Custom voice',
                              settings: request.settings,
                            },
                            null,
                            2,
                          ),
                        ],
                        { type: 'application/json' },
                      ),
                      'island-preset.json',
                    )
                  }
                >
                  Export preset JSON
                </button>
                <label className="file-label">
                  Import preset
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void importPreset(f);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </details>
          </section>
        </div>
        <section className="panel controls-panel">
          <div className="section-heading">
            <div>
              <h2>Shape the voice</h2>
              <p className="muted selected-name">
                {presets.find((p) => p.id === selected)?.name || 'Custom voice'}
              </p>
            </div>
            <button
              className="quiet"
              onClick={() => applyPreset(defaults, 'islander')}
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
          <div className="knobs">
            {controls
              .filter((c) => c.group === 'voice')
              .map((c) => (
                <div className="control" key={c.key}>
                  <div className="control-label">
                    <span id={`label-${c.key}`}>{c.label}</span>
                    <output>
                      {request.settings[c.key as keyof VoiceSettings]}
                      {c.unit}
                    </output>
                  </div>
                  <Slider
                    aria-labelledby={`label-${c.key}`}
                    aria-describedby={`hint-${c.key}`}
                    min={c.min}
                    max={c.max}
                    step={c.step}
                    value={[request.settings[c.key as keyof VoiceSettings]]}
                    onValueChange={(v) =>
                      update(c.key, Array.isArray(v) ? v[0] : v)
                    }
                  />
                  <small id={`hint-${c.key}`}>{c.hint}</small>
                </div>
              ))}
          </div>
          <details className="effects" open>
            <summary>
              Effects <span className="muted">· texture & color</span>
            </summary>
            <div className="knobs">
              {controls
                .filter((c) => c.group === 'effects')
                .map((c) => (
                  <div className="control" key={c.key}>
                    <div className="control-label">
                      <span id={`label-${c.key}`}>{c.label}</span>
                      <output>
                        {request.settings[c.key as keyof VoiceSettings]}
                        {c.unit}
                      </output>
                    </div>
                    <Slider
                      aria-labelledby={`label-${c.key}`}
                      aria-describedby={`hint-${c.key}`}
                      min={c.min}
                      max={c.max}
                      step={c.step}
                      value={[request.settings[c.key as keyof VoiceSettings]]}
                      onValueChange={(v) =>
                        update(c.key, Array.isArray(v) ? v[0] : v)
                      }
                    />
                    <small id={`hint-${c.key}`}>{c.hint}</small>
                  </div>
                ))}
            </div>
          </details>
          <p className="control-note">
            Changes apply to the next generated clip.
          </p>
        </section>
      </div>
      <footer>
        <span>
          Independent experiment · Inspired by Tomodachi Life, not Nintendo’s
          engine.
        </span>
        <span>
          Powered by{' '}
          <a href="https://github.com/echogarden-project/espeak-ng-emscripten">
            eSpeak NG
          </a>{' '}
          · <a href="/engine/COPYING">GPL-3.0</a> ·{' '}
          <a href="/engine/NOTICE.txt">Source & credits</a>
        </span>
      </footer>
    </main>
  );
}
