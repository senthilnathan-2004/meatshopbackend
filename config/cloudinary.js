const cloudinary = require("cloudinary").v2

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploadImage = async (file, folder = "meat-shop") => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: folder,
      resource_type: "auto",
      transformation: [{ width: 800, height: 600, crop: "limit" }, { quality: "auto" }, { fetch_format: "auto" }],
    })

    return {
      url: result.secure_url,
      public_id: result.public_id,
    }
  } catch (error) {
    throw new Error("Image upload failed")
  }
}

const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (error) {
    console.error("Image deletion failed:", error)
  }
}

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage,
}
