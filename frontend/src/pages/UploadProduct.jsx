import { useEffect, useState } from 'react'
import Header from '../components/Header'
import { api } from '../lib/api'
import { useNavigate } from 'react-router-dom'
export default function UploadProduct() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('fashion')
  const [image, setImage] = useState(null)
  const [caption, setCaption] = useState('')
  const [memeUrl, setMemeUrl] = useState('')
  const [productId, setProductId] = useState('')
  const [igConnectUrl, setIgConnectUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!token || !user) return navigate('/login')
    if (user.role !== 'artisan') return navigate('/')
  }, [])

  const loadIgConnect = async () => {
    try {
      const { data } = await api.get('/instagram/connect')
      setIgConnectUrl(data.data.url)
    } catch {}
  }

  const toBase64 = (file) => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result)
    fr.onerror = rej
    fr.readAsDataURL(file)
  })

  const create = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/products', { name, description, price: Number(price), category, images: [] })
      const id = data.data._id
      setProductId(id)
      if (image) {
        const base64 = await toBase64(image)
        await api.post(`/products/${id}/images`, { imageBase64: base64 })
      }
      // Generate caption
      const cap = await api.post('/meme/generate-caption', { productId: id })
      setCaption(cap.data.data.caption)
      await loadIgConnect()
    } finally {
      setLoading(false)
    }
  }

  const createMeme = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/meme/create', { productId, captionTop: caption, captionBottom: '' })
      setMemeUrl(data.data.memeUrl)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-2xl mx-auto pt-24 px-4">
        <h1 className="text-2xl font-bold mb-6">Upload Product</h1>
        <form onSubmit={create} className="space-y-4">
          <input className="w-full border rounded-md px-3 py-2" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
          <textarea className="w-full border rounded-md px-3 py-2" placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)} />
          <input className="w-full border rounded-md px-3 py-2" placeholder="Price" value={price} onChange={e=>setPrice(e.target.value)} />
          <select className="w-full border rounded-md px-3 py-2" value={category} onChange={e=>setCategory(e.target.value)}>
            {['fashion','jewelry','home','art','crafts','beauty','electronics','books','food','other'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="file" accept="image/*" onChange={e=>setImage(e.target.files?.[0])} />
          <button disabled={loading} className="px-4 py-2 rounded-md bg-indigo-600 text-white">{loading ? 'Creating...' : 'Create'}</button>
        </form>

        {productId && (
          <div className="mt-8 border-t pt-6">
            <div className="mb-3 font-semibold">AI Caption</div>
            <textarea className="w-full border rounded-md px-3 py-2" value={caption} onChange={e=>setCaption(e.target.value)} />
            <button onClick={createMeme} className="mt-3 px-4 py-2 rounded-md bg-indigo-600 text-white">Generate Meme</button>
            {memeUrl && <img className="mt-4 rounded-md border" src={memeUrl} alt="meme" />}
            <div className="mt-6 flex gap-3">
              {igConnectUrl && <a href={igConnectUrl} className="px-4 py-2 rounded-md border">Connect Instagram</a>}
              {memeUrl && <PostToInstagram productId={productId} caption={caption} />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PostToInstagram({ productId, caption }) {
  const [posting, setPosting] = useState(false)
  const [msg, setMsg] = useState('')
  const post = async () => {
    setPosting(true)
    setMsg('')
    try {
      await api.post('/instagram/post', { productId, caption })
      setMsg('Posted to Instagram!')
    } catch (e) {
      setMsg(e.response?.data?.message || 'Failed to post')
    } finally {
      setPosting(false)
    }
  }
  return (
    <div className="flex items-center gap-3">
      <button disabled={posting} onClick={post} className="px-4 py-2 rounded-md bg-black text-white">{posting ? 'Posting...' : 'Post to Instagram'}</button>
      {msg && <div className="text-sm text-gray-600">{msg}</div>}
    </div>
  )
}


