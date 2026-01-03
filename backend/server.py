from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from firebase_config import verify_firebase_token
import socketio
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Socket.IO setup
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Admin email - only this user can create groups/channels
ADMIN_EMAIL = "metaticaretim@gmail.com"

# Default groups
TURKEY_GROUP_ID = "turkiye-grubu"
BURSA_GROUP_ID = "bursa-grubu"

# Helper function to clean MongoDB documents for JSON serialization
def clean_doc(doc):
    """Remove _id and convert datetime objects for JSON serialization"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [clean_doc(d) for d in doc]
    if isinstance(doc, dict):
        doc.pop('_id', None)
        for key, value in doc.items():
            if isinstance(value, datetime):
                doc[key] = value.isoformat()
            elif isinstance(value, ObjectId):
                doc[key] = str(value)
            elif isinstance(value, dict):
                doc[key] = clean_doc(value)
            elif isinstance(value, list):
                doc[key] = [clean_doc(item) if isinstance(item, dict) else item for item in value]
        return doc
    return doc

# Models
class UserProfile(BaseModel):
    uid: str
    email: str
    firstName: str
    lastName: str
    phone: Optional[str] = None
    city: str
    occupation: Optional[str] = None
    profileImageUrl: Optional[str] = None
    cvUrl: Optional[str] = None
    isAdmin: bool = False
    isBanned: bool = False
    isRestricted: bool = False
    restrictedUntil: Optional[datetime] = None
    groups: List[str] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class UserRegister(BaseModel):
    email: str
    firstName: str
    lastName: str
    phone: Optional[str] = None
    city: str
    occupation: Optional[str] = None

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    groupId: Optional[str] = None
    chatId: Optional[str] = None
    senderId: str
    senderName: str
    senderProfileImage: Optional[str] = None
    receiverId: Optional[str] = None
    content: str
    type: str = "text"  # text, image, video, audio, file, location, contact
    fileUrl: Optional[str] = None
    fileName: Optional[str] = None
    fileSize: Optional[int] = None
    fileMimeType: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    locationName: Optional[str] = None
    contactName: Optional[str] = None
    contactPhone: Optional[str] = None
    contactEmail: Optional[str] = None
    reactions: List[dict] = []  # [{emoji: str, userId: str, userName: str}]
    isPinned: bool = False
    isDeleted: bool = False
    deletedForEveryone: bool = False
    deletedFor: List[str] = []  # Kullanıcı bazlı silme
    replyTo: Optional[str] = None
    replyToContent: Optional[str] = None  # Yanıtlanan mesajın içeriği
    replyToSenderName: Optional[str] = None
    isEdited: bool = False
    editHistory: List[dict] = []  # [{content: str, editedAt: datetime}]
    editedAt: Optional[datetime] = None
    # Okundu bilgisi
    status: str = "sent"  # sent, delivered, read
    deliveredTo: List[str] = []  # İletilen kullanıcılar
    readBy: List[str] = []  # Okuyan kullanıcılar
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class CustomGroup(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    type: str = "group"
    isPublic: bool = True
    createdBy: str
    createdByName: str
    members: List[str] = []
    admins: List[str] = []
    bannedUsers: List[str] = []
    restrictedUsers: List[dict] = []
    pinnedMessages: List[str] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class Poll(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    groupId: str
    question: str
    options: List[dict] = []
    createdBy: str
    createdByName: str
    isAnonymous: bool = False
    multipleChoice: bool = False
    expiresAt: Optional[datetime] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class Post(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    userName: str
    userProfileImage: Optional[str] = None
    content: str
    imageUrl: Optional[str] = None
    likes: List[str] = []
    comments: List[dict] = []
    shares: int = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    postId: str
    userId: str
    userName: str
    userProfileImage: Optional[str] = None
    content: str
    likes: List[str] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Service(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str
    userName: str
    title: str
    description: str
    category: str
    city: str
    contactPhone: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Community (Topluluk) Model
class Community(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    city: str
    imageUrl: Optional[str] = None
    coverImageUrl: Optional[str] = None
    superAdmins: List[str] = []  # Süper Yöneticiler (topluluk sahipleri)
    members: List[str] = []  # Tüm üyeler
    subGroups: List[str] = []  # Alt grup ID'leri
    announcementChannelId: Optional[str] = None  # Duyuru kanalı ID
    createdBy: str
    createdByName: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)

# SubGroup (Alt Grup) Model - Topluluk altındaki gruplar
class SubGroup(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    communityId: str  # Bağlı olduğu topluluk
    name: str
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    groupAdmins: List[str] = []  # Grup Yöneticileri
    members: List[str] = []
    pendingRequests: List[dict] = []  # Katılma istekleri [{uid, name, timestamp}]
    isPublic: bool = True
    createdBy: str
    createdByName: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)

# Announcement Channel (Duyuru Kanalı) Model
class AnnouncementChannel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    communityId: str
    name: str = "Duyurular"
    description: str = "Sadece yöneticilerin mesaj atabileceği duyuru kanalı"
    createdAt: datetime = Field(default_factory=datetime.utcnow)

# Join Request (Katılma İsteği) Model
class JoinRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subGroupId: str
    userId: str
    userName: str
    userProfileImage: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected
    createdAt: datetime = Field(default_factory=datetime.utcnow)

# Turkish Cities List
TURKISH_CITIES = [
    'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya',
    'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik',
    'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum',
    'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir',
    'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul',
    'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kilis',
    'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa',
    'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye',
    'Rize', 'Sakarya', 'Samsun', 'Şanlıurfa', 'Siirt', 'Sinop', 'Sivas', 'Şırnak',
    'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'
]

# Dependency to verify Firebase token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        decoded_token = verify_firebase_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

# Routes
@api_router.get("/")
async def root():
    return {"message": "Network Solution API"}

@api_router.post("/user/register")
async def register_user(user_data: UserRegister, current_user: dict = Depends(get_current_user)):
    existing_user = await db.users.find_one({"uid": current_user['uid']})
    if existing_user:
        return clean_doc(existing_user)
    
    is_admin = user_data.email.lower() == ADMIN_EMAIL.lower()
    user_groups = []
    user_communities = []
    
    # Şehre göre topluluk ataması
    city_community = await db.communities.find_one({"city": user_data.city})
    if city_community:
        user_communities.append(city_community['id'])
        # Kullanıcıyı topluluk üyelerine ekle
        await db.communities.update_one(
            {"id": city_community['id']},
            {"$addToSet": {"members": current_user['uid']}}
        )
    
    # Admin ise tüm toplulukların süper yöneticisi olarak ekle
    if is_admin:
        all_communities = await db.communities.find().to_list(100)
        for community in all_communities:
            if community['id'] not in user_communities:
                user_communities.append(community['id'])
            await db.communities.update_one(
                {"id": community['id']},
                {"$addToSet": {"superAdmins": current_user['uid'], "members": current_user['uid']}}
            )
    
    user_profile = UserProfile(
        uid=current_user['uid'],
        isAdmin=is_admin,
        groups=user_groups,
        **user_data.dict()
    )
    
    # communities alanını ekle
    user_dict = user_profile.dict()
    user_dict['communities'] = user_communities
    
    await db.users.insert_one(user_dict)
    
    # Eski grup sistemini de destekle (geriye uyumluluk)
    await ensure_default_groups_exist(current_user['uid'], f"{user_data.firstName} {user_data.lastName}", is_admin)
    
    # Response için _id'yi kaldır (insert sonrası eklenir)
    user_dict.pop('_id', None)
    
    return clean_doc(user_dict)

async def ensure_default_groups_exist(creator_uid: str, creator_name: str, is_admin: bool):
    turkey_group = await db.groups.find_one({"id": TURKEY_GROUP_ID})
    if not turkey_group:
        new_group = {
            "id": TURKEY_GROUP_ID,
            "groupId": TURKEY_GROUP_ID,
            "name": "Türkiye Girişimciler",
            "description": "Türkiye geneli girişimcilik grubu",
            "city": "Türkiye",
            "type": "group",
            "isPublic": True,
            "imageUrl": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400",
            "createdBy": creator_uid if is_admin else "system",
            "createdByName": creator_name if is_admin else "System",
            "members": [creator_uid] if is_admin else [],
            "admins": [creator_uid] if is_admin else [],
            "bannedUsers": [],
            "restrictedUsers": [],
            "pinnedMessages": [],
            "createdAt": datetime.utcnow()
        }
        await db.groups.insert_one(new_group)
    
    bursa_group = await db.groups.find_one({"id": BURSA_GROUP_ID})
    if not bursa_group:
        new_group = {
            "id": BURSA_GROUP_ID,
            "groupId": BURSA_GROUP_ID,
            "name": "Bursa Girişimciler",
            "description": "Bursa ili girişimcilik grubu",
            "city": "Bursa",
            "type": "group",
            "isPublic": True,
            "imageUrl": "https://images.unsplash.com/photo-1569383746724-6f1b882b8f46?w=400",
            "createdBy": creator_uid if is_admin else "system",
            "createdByName": creator_name if is_admin else "System",
            "members": [creator_uid] if is_admin else [],
            "admins": [creator_uid] if is_admin else [],
            "bannedUsers": [],
            "restrictedUsers": [],
            "pinnedMessages": [],
            "createdAt": datetime.utcnow()
        }
        await db.groups.insert_one(new_group)

@api_router.get("/user/profile")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    if not user:
        # Return minimal profile if user exists in Firebase but not in DB yet
        return {
            "uid": current_user['uid'],
            "email": current_user.get('email', ''),
            "firstName": "",
            "lastName": "",
            "phone": None,
            "city": "",
            "profileImageUrl": None,
            "isAdmin": False,
            "groups": [],
            "needsRegistration": True
        }
    return clean_doc(user)

@api_router.put("/user/profile")
async def update_user_profile(updates: dict, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"uid": current_user['uid']},
        {"$set": updates}
    )
    return {"message": "Profile updated"}

@api_router.get("/groups")
async def get_groups(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"city": user.get('city'), "groupId": user.get('city')}

@api_router.get("/messages/{group_id}")
async def get_messages(group_id: str, current_user: dict = Depends(get_current_user)):
    messages = await db.messages.find({
        "groupId": group_id,
        "$or": [
            {"isDeleted": {"$ne": True}},
            {"deletedForEveryone": {"$ne": True}}
        ]
    }).sort("timestamp", -1).limit(100).to_list(100)
    for msg in messages:
        if '_id' in msg:
            del msg['_id']
        # Check if deleted for this user
        if msg.get('deletedFor') and current_user['uid'] in msg.get('deletedFor', []):
            msg['isDeleted'] = True
            msg['content'] = 'Bu mesaj silindi'
    return clean_doc(messages)

@api_router.post("/messages")
async def send_message(message: dict, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    
    new_message = Message(
        groupId=message['groupId'],
        senderId=current_user['uid'],
        senderName=f"{user['firstName']} {user['lastName']}",
        content=message.get('content', ''),
        type=message.get('type', 'text'),
        fileUrl=message.get('fileUrl'),
        latitude=message.get('latitude'),
        longitude=message.get('longitude'),
        locationName=message.get('locationName'),
        contactName=message.get('contactName'),
        contactPhone=message.get('contactPhone'),
        contactEmail=message.get('contactEmail'),
        replyTo=message.get('replyTo')
    )
    
    await db.messages.insert_one(new_message.dict())
    await sio.emit('new_message', new_message.dict(), room=message['groupId'])
    
    return new_message

# Delete message for me only
@api_router.delete("/messages/{message_id}/delete-for-me")
async def delete_message_for_me(message_id: str, current_user: dict = Depends(get_current_user)):
    message = await db.messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    await db.messages.update_one(
        {"id": message_id},
        {"$addToSet": {"deletedFor": current_user['uid']}}
    )
    return {"message": "Mesaj sizin için silindi"}

# Delete message for everyone
@api_router.delete("/messages/{message_id}/delete-for-everyone")
async def delete_message_for_everyone(message_id: str, current_user: dict = Depends(get_current_user)):
    message = await db.messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    # Only sender can delete for everyone
    if message['senderId'] != current_user['uid']:
        raise HTTPException(status_code=403, detail="Sadece kendi mesajınızı silebilirsiniz")
    
    await db.messages.update_one(
        {"id": message_id},
        {"$set": {"deletedForEveryone": True, "content": "Bu mesaj silindi", "isDeleted": True}}
    )
    
    # Emit socket event
    room = message.get('groupId') or message.get('chatId')
    if room:
        await sio.emit('message_deleted', {"messageId": message_id}, room=room)
    
    return {"message": "Mesaj herkesten silindi"}

# Add reaction to message
@api_router.post("/messages/{message_id}/react")
async def add_reaction(message_id: str, reaction_data: dict, current_user: dict = Depends(get_current_user)):
    message = await db.messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    emoji = reaction_data.get('emoji')
    if not emoji:
        raise HTTPException(status_code=400, detail="Emoji gerekli")
    
    reactions = message.get('reactions', {})
    
    # Toggle reaction
    if emoji in reactions and current_user['uid'] in reactions[emoji]:
        # Remove reaction
        reactions[emoji].remove(current_user['uid'])
        if not reactions[emoji]:
            del reactions[emoji]
    else:
        # Add reaction
        if emoji not in reactions:
            reactions[emoji] = []
        reactions[emoji].append(current_user['uid'])
    
    await db.messages.update_one(
        {"id": message_id},
        {"$set": {"reactions": reactions}}
    )
    
    room = message.get('groupId') or message.get('chatId')
    if room:
        await sio.emit('message_reaction', {"messageId": message_id, "reactions": reactions}, room=room)
    
    return {"reactions": reactions}

# Pin message in group
@api_router.post("/messages/{message_id}/pin")
async def pin_message(message_id: str, current_user: dict = Depends(get_current_user)):
    message = await db.messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    is_pinned = not message.get('isPinned', False)
    
    await db.messages.update_one(
        {"id": message_id},
        {"$set": {"isPinned": is_pinned}}
    )
    
    room = message.get('groupId') or message.get('chatId')
    if room:
        await sio.emit('message_pinned', {"messageId": message_id, "isPinned": is_pinned}, room=room)
    
    return {"isPinned": is_pinned, "message": "Mesaj sabitlendi" if is_pinned else "Sabitleme kaldırıldı"}

# Get pinned messages
@api_router.get("/messages/{group_id}/pinned")
async def get_pinned_messages_list(group_id: str, current_user: dict = Depends(get_current_user)):
    messages = await db.messages.find({"groupId": group_id, "isPinned": True}).sort("timestamp", -1).to_list(50)
    for msg in messages:
        if '_id' in msg:
            del msg['_id']
    return clean_doc(messages)

@api_router.get("/posts")
async def get_posts(current_user: dict = Depends(get_current_user)):
    posts = await db.posts.find().sort("timestamp", -1).limit(50).to_list(50)
    for post in posts:
        if '_id' in post:
            del post['_id']
        # Add isLiked flag for current user
        post['isLiked'] = current_user['uid'] in post.get('likes', [])
        post['likeCount'] = len(post.get('likes', []))
        post['commentCount'] = len(post.get('comments', []))
    return clean_doc(posts)

@api_router.post("/posts")
async def create_post(post: dict, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    
    new_post = Post(
        userId=current_user['uid'],
        userName=f"{user['firstName']} {user['lastName']}",
        userProfileImage=user.get('profileImageUrl'),
        content=post['content'],
        imageUrl=post.get('imageUrl')
    )
    
    await db.posts.insert_one(new_post.dict())
    return new_post

# Like/Unlike a post
@api_router.post("/posts/{post_id}/like")
async def toggle_like_post(post_id: str, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Gönderi bulunamadı")
    
    likes = post.get('likes', [])
    if current_user['uid'] in likes:
        # Unlike
        await db.posts.update_one(
            {"id": post_id},
            {"$pull": {"likes": current_user['uid']}}
        )
        return {"liked": False, "likeCount": len(likes) - 1}
    else:
        # Like
        await db.posts.update_one(
            {"id": post_id},
            {"$addToSet": {"likes": current_user['uid']}}
        )
        return {"liked": True, "likeCount": len(likes) + 1}

# Get comments for a post
@api_router.get("/posts/{post_id}/comments")
async def get_post_comments(post_id: str, current_user: dict = Depends(get_current_user)):
    comments = await db.comments.find({"postId": post_id}).sort("timestamp", 1).to_list(100)
    for comment in comments:
        if '_id' in comment:
            del comment['_id']
        comment['isLiked'] = current_user['uid'] in comment.get('likes', [])
        comment['likeCount'] = len(comment.get('likes', []))
    return clean_doc(comments)

# Add comment to a post
@api_router.post("/posts/{post_id}/comments")
async def add_comment(post_id: str, comment_data: dict, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Gönderi bulunamadı")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    
    new_comment = Comment(
        postId=post_id,
        userId=current_user['uid'],
        userName=f"{user['firstName']} {user['lastName']}",
        userProfileImage=user.get('profileImageUrl'),
        content=comment_data['content']
    )
    
    await db.comments.insert_one(new_comment.dict())
    
    # Update comment count in post
    await db.posts.update_one(
        {"id": post_id},
        {"$push": {"comments": {"id": new_comment.id, "userId": current_user['uid']}}}
    )
    
    result = new_comment.dict()
    result['isLiked'] = False
    result['likeCount'] = 0
    return result

# Like a comment
@api_router.post("/comments/{comment_id}/like")
async def toggle_like_comment(comment_id: str, current_user: dict = Depends(get_current_user)):
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Yorum bulunamadı")
    
    likes = comment.get('likes', [])
    if current_user['uid'] in likes:
        await db.comments.update_one(
            {"id": comment_id},
            {"$pull": {"likes": current_user['uid']}}
        )
        return {"liked": False, "likeCount": len(likes) - 1}
    else:
        await db.comments.update_one(
            {"id": comment_id},
            {"$addToSet": {"likes": current_user['uid']}}
        )
        return {"liked": True, "likeCount": len(likes) + 1}

# Delete a comment
@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, current_user: dict = Depends(get_current_user)):
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Yorum bulunamadı")
    
    if comment['userId'] != current_user['uid']:
        raise HTTPException(status_code=403, detail="Bu yorumu silme yetkiniz yok")
    
    await db.comments.delete_one({"id": comment_id})
    await db.posts.update_one(
        {"id": comment['postId']},
        {"$pull": {"comments": {"id": comment_id}}}
    )
    return {"message": "Yorum silindi"}

# Share post (increment share count)
@api_router.post("/posts/{post_id}/share")
async def share_post(post_id: str, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Gönderi bulunamadı")
    
    await db.posts.update_one(
        {"id": post_id},
        {"$inc": {"shares": 1}}
    )
    return {"shares": post.get('shares', 0) + 1}

# Get single post with details
@api_router.get("/posts/{post_id}")
async def get_post(post_id: str, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Gönderi bulunamadı")
    
    if '_id' in post:
        del post['_id']
    post['isLiked'] = current_user['uid'] in post.get('likes', [])
    post['likeCount'] = len(post.get('likes', []))
    post['commentCount'] = len(post.get('comments', []))
    return post

@api_router.get("/services")
async def get_services(current_user: dict = Depends(get_current_user)):
    services = await db.services.find().sort("timestamp", -1).to_list(100)
    for service in services:
        if '_id' in service:
            del service['_id']
    return clean_doc(services)

@api_router.post("/services")
async def create_service(service: dict, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    
    new_service = Service(
        userId=current_user['uid'],
        userName=f"{user['firstName']} {user['lastName']}",
        title=service['title'],
        description=service['description'],
        category=service['category'],
        city=user['city'],
        contactPhone=user.get('phone', '')
    )
    
    await db.services.insert_one(new_service.dict())
    return new_service

@api_router.get("/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    users = await db.users.find({"uid": {"$ne": current_user['uid']}}).to_list(1000)
    for u in users:
        if '_id' in u:
            del u['_id']
    return clean_doc(users)

@api_router.get("/private-messages/{other_user_id}")
async def get_private_messages(other_user_id: str, current_user: dict = Depends(get_current_user)):
    user_ids = sorted([current_user['uid'], other_user_id])
    chat_id = f"{user_ids[0]}_{user_ids[1]}"
    
    messages = await db.messages.find({
        "chatId": chat_id,
        "$or": [
            {"deletedForEveryone": {"$ne": True}},
            {"isDeleted": {"$ne": True}}
        ]
    }).sort("timestamp", -1).limit(100).to_list(100)
    for msg in messages:
        if '_id' in msg:
            del msg['_id']
        if msg.get('deletedFor') and current_user['uid'] in msg.get('deletedFor', []):
            msg['isDeleted'] = True
            msg['content'] = 'Bu mesaj silindi'
    return clean_doc(messages)

@api_router.post("/private-messages")
async def send_private_message(message: dict, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    receiver_id = message['receiverId']
    
    user_ids = sorted([current_user['uid'], receiver_id])
    chat_id = f"{user_ids[0]}_{user_ids[1]}"
    
    new_message = Message(
        chatId=chat_id,
        senderId=current_user['uid'],
        senderName=f"{user['firstName']} {user['lastName']}",
        receiverId=receiver_id,
        content=message.get('content', ''),
        type=message.get('type', 'text'),
        fileUrl=message.get('fileUrl'),
        latitude=message.get('latitude'),
        longitude=message.get('longitude'),
        locationName=message.get('locationName'),
        contactName=message.get('contactName'),
        contactPhone=message.get('contactPhone'),
        contactEmail=message.get('contactEmail')
    )
    
    await db.messages.insert_one(new_message.dict())
    await sio.emit('new_private_message', new_message.dict(), room=chat_id)
    
    return new_message

@api_router.get("/my-posts")
async def get_my_posts(current_user: dict = Depends(get_current_user)):
    posts = await db.posts.find({"userId": current_user['uid']}).sort("timestamp", -1).to_list(100)
    for post in posts:
        if '_id' in post:
            del post['_id']
    return clean_doc(posts)

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id, "userId": current_user['uid']})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await db.posts.delete_one({"id": post_id})
    return {"message": "Post deleted"}

async def check_admin(current_user: dict):
    user = await db.users.find_one({"uid": current_user['uid']})
    if not user or not user.get('isAdmin', False):
        if user and user.get('email', '').lower() != ADMIN_EMAIL.lower():
            raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok.")
    return user

@api_router.get("/user/is-admin")
async def check_user_admin(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    is_admin = user.get('isAdmin', False) if user else False
    if user and user.get('email', '').lower() == ADMIN_EMAIL.lower():
        is_admin = True
    return {"isAdmin": is_admin}

@api_router.get("/all-groups")
async def get_all_groups(current_user: dict = Depends(get_current_user)):
    groups = await db.groups.find().to_list(100)
    
    for group in groups:
        if '_id' in group:
            del group['_id']
        group['memberCount'] = len(group.get('members', []))
        group['isAdmin'] = current_user['uid'] in group.get('admins', [])
    
    return clean_doc(groups)

@api_router.get("/public-groups")
async def get_public_groups():
    groups = await db.groups.find().to_list(100)
    
    for group in groups:
        if '_id' in group:
            del group['_id']
        group['memberCount'] = len(group.get('members', []))
    
    return clean_doc(groups)

@api_router.post("/custom-groups")
async def create_custom_group(group_data: dict, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    
    is_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    if not is_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok.")
    
    group_id = str(uuid.uuid4())
    new_group = {
        "id": group_id,
        "groupId": group_id,
        "name": group_data['name'],
        "description": group_data.get('description', ''),
        "imageUrl": group_data.get('imageUrl'),
        "city": "Özel",
        "type": group_data.get('type', 'group'),
        "isPublic": True,
        "createdBy": current_user['uid'],
        "createdByName": f"{user['firstName']} {user['lastName']}",
        "members": [current_user['uid']],
        "admins": [current_user['uid']],
        "bannedUsers": [],
        "restrictedUsers": [],
        "pinnedMessages": [],
        "createdAt": datetime.utcnow()
    }
    
    await db.groups.insert_one(new_group)
    
    await db.users.update_one(
        {"uid": current_user['uid']},
        {"$addToSet": {"groups": group_id}}
    )
    
    if '_id' in new_group:
        del new_group['_id']
    
    return new_group

@api_router.get("/custom-groups")
async def get_custom_groups(current_user: dict = Depends(get_current_user)):
    groups = await db.custom_groups.find().sort("createdAt", -1).to_list(100)
    for group in groups:
        if '_id' in group:
            del group['_id']
    return clean_doc(groups)

@api_router.delete("/custom-groups/{group_id}")
async def delete_custom_group(group_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    
    is_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    if not is_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok.")
    
    await db.custom_groups.delete_one({"id": group_id})
    return {"message": "Grup silindi"}

async def check_group_admin(group_id: str, user_uid: str):
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    user = await db.users.find_one({"uid": user_uid})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    is_group_admin = user_uid in group.get('admins', [])
    
    if not is_global_admin and not is_group_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    return group, user

@api_router.get("/admin/groups")
async def get_admin_groups(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    is_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if is_admin:
        groups = await db.groups.find().to_list(100)
    else:
        groups = await db.groups.find({"admins": current_user['uid']}).to_list(100)
    
    for group in groups:
        if '_id' in group:
            del group['_id']
        group['memberCount'] = len(group.get('members', []))
    
    return clean_doc(groups)

@api_router.get("/admin/groups/{group_id}/members")
async def get_group_members(group_id: str, current_user: dict = Depends(get_current_user)):
    group, _ = await check_group_admin(group_id, current_user['uid'])
    
    member_ids = group.get('members', [])
    members = await db.users.find({"uid": {"$in": member_ids}}).to_list(1000)
    
    for member in members:
        if '_id' in member:
            del member['_id']
        member['isGroupAdmin'] = member['uid'] in group.get('admins', [])
        member['isBannedFromGroup'] = member['uid'] in group.get('bannedUsers', [])
        restricted_users = group.get('restrictedUsers', [])
        restriction = next((r for r in restricted_users if r.get('uid') == member['uid']), None)
        member['isRestricted'] = restriction is not None
        member['restrictedUntil'] = restriction.get('until') if restriction else None
    
    return members

@api_router.post("/admin/groups/{group_id}/ban/{user_id}")
async def ban_user_from_group(group_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    group, _ = await check_group_admin(group_id, current_user['uid'])
    
    if user_id in group.get('admins', []):
        raise HTTPException(status_code=400, detail="Yöneticileri yasaklayamazsınız")
    
    await db.groups.update_one(
        {"id": group_id},
        {
            "$addToSet": {"bannedUsers": user_id},
            "$pull": {"members": user_id}
        }
    )
    
    await db.users.update_one(
        {"uid": user_id},
        {"$pull": {"groups": group_id}}
    )
    
    return {"message": "Kullanıcı gruptan yasaklandı"}

@api_router.post("/admin/groups/{group_id}/unban/{user_id}")
async def unban_user_from_group(group_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    await check_group_admin(group_id, current_user['uid'])
    
    await db.groups.update_one(
        {"id": group_id},
        {"$pull": {"bannedUsers": user_id}}
    )
    
    return {"message": "Kullanıcının yasağı kaldırıldı"}

@api_router.post("/admin/groups/{group_id}/restrict/{user_id}")
async def restrict_user(group_id: str, user_id: str, duration_hours: int = 24, current_user: dict = Depends(get_current_user)):
    group, _ = await check_group_admin(group_id, current_user['uid'])
    
    if user_id in group.get('admins', []):
        raise HTTPException(status_code=400, detail="Yöneticileri kısıtlayamazsınız")
    
    from datetime import timedelta
    until = datetime.utcnow() + timedelta(hours=duration_hours)
    
    await db.groups.update_one(
        {"id": group_id},
        {"$pull": {"restrictedUsers": {"uid": user_id}}}
    )
    
    await db.groups.update_one(
        {"id": group_id},
        {"$push": {"restrictedUsers": {"uid": user_id, "until": until, "reason": "Admin tarafından kısıtlandı"}}}
    )
    
    return {"message": f"Kullanıcı {duration_hours} saat boyunca kısıtlandı", "until": until}

@api_router.post("/admin/groups/{group_id}/unrestrict/{user_id}")
async def unrestrict_user(group_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    await check_group_admin(group_id, current_user['uid'])
    
    await db.groups.update_one(
        {"id": group_id},
        {"$pull": {"restrictedUsers": {"uid": user_id}}}
    )
    
    return {"message": "Kullanıcının kısıtlaması kaldırıldı"}

@api_router.post("/admin/groups/{group_id}/kick/{user_id}")
async def kick_user_from_group(group_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    group, _ = await check_group_admin(group_id, current_user['uid'])
    
    if user_id in group.get('admins', []):
        raise HTTPException(status_code=400, detail="Yöneticileri atamazsınız")
    
    await db.groups.update_one(
        {"id": group_id},
        {"$pull": {"members": user_id}}
    )
    
    await db.users.update_one(
        {"uid": user_id},
        {"$pull": {"groups": group_id}}
    )
    
    return {"message": "Kullanıcı gruptan çıkarıldı"}

@api_router.delete("/admin/groups/{group_id}/messages/user/{user_id}")
async def delete_user_messages(group_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    await check_group_admin(group_id, current_user['uid'])
    
    result = await db.messages.delete_many({"groupId": group_id, "senderId": user_id})
    
    return {"message": f"{result.deleted_count} mesaj silindi"}

@api_router.delete("/admin/messages/{message_id}")
async def delete_message(message_id: str, current_user: dict = Depends(get_current_user)):
    message = await db.messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    group_id = message.get('groupId')
    if group_id:
        await check_group_admin(group_id, current_user['uid'])
    
    await db.messages.delete_one({"id": message_id})
    
    return {"message": "Mesaj silindi"}

@api_router.put("/admin/groups/{group_id}")
async def update_group_settings(group_id: str, settings: dict, current_user: dict = Depends(get_current_user)):
    await check_group_admin(group_id, current_user['uid'])
    
    update_data = {}
    if 'name' in settings:
        update_data['name'] = settings['name']
    if 'description' in settings:
        update_data['description'] = settings['description']
    if 'imageUrl' in settings:
        update_data['imageUrl'] = settings['imageUrl']
    if 'isPublic' in settings:
        update_data['isPublic'] = settings['isPublic']
    
    if update_data:
        await db.groups.update_one({"id": group_id}, {"$set": update_data})
    
    return {"message": "Grup ayarları güncellendi"}

@api_router.post("/admin/groups/{group_id}/pin/{message_id}")
async def pin_message(group_id: str, message_id: str, current_user: dict = Depends(get_current_user)):
    await check_group_admin(group_id, current_user['uid'])
    
    await db.groups.update_one(
        {"id": group_id},
        {"$addToSet": {"pinnedMessages": message_id}}
    )
    
    await db.messages.update_one(
        {"id": message_id},
        {"$set": {"isPinned": True}}
    )
    
    return {"message": "Mesaj sabitlendi"}

@api_router.post("/admin/groups/{group_id}/unpin/{message_id}")
async def unpin_message(group_id: str, message_id: str, current_user: dict = Depends(get_current_user)):
    await check_group_admin(group_id, current_user['uid'])
    
    await db.groups.update_one(
        {"id": group_id},
        {"$pull": {"pinnedMessages": message_id}}
    )
    
    await db.messages.update_one(
        {"id": message_id},
        {"$set": {"isPinned": False}}
    )
    
    return {"message": "Mesaj sabitlemesi kaldırıldı"}

@api_router.get("/admin/groups/{group_id}/pinned")
async def get_pinned_messages(group_id: str, current_user: dict = Depends(get_current_user)):
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    pinned_ids = group.get('pinnedMessages', [])
    messages = await db.messages.find({"id": {"$in": pinned_ids}}).to_list(100)
    
    for msg in messages:
        if '_id' in msg:
            del msg['_id']
    
    return clean_doc(messages)

@api_router.post("/admin/groups/{group_id}/polls")
async def create_poll(group_id: str, poll_data: dict, current_user: dict = Depends(get_current_user)):
    group, user = await check_group_admin(group_id, current_user['uid'])
    
    options = [{"id": str(uuid.uuid4()), "text": opt, "votes": []} for opt in poll_data.get('options', [])]
    
    new_poll = Poll(
        groupId=group_id,
        question=poll_data['question'],
        options=options,
        createdBy=current_user['uid'],
        createdByName=f"{user['firstName']} {user['lastName']}",
        isAnonymous=poll_data.get('isAnonymous', False),
        multipleChoice=poll_data.get('multipleChoice', False)
    )
    
    await db.polls.insert_one(new_poll.dict())
    
    return new_poll

@api_router.get("/groups/{group_id}/polls")
async def get_group_polls(group_id: str, current_user: dict = Depends(get_current_user)):
    polls = await db.polls.find({"groupId": group_id}).sort("createdAt", -1).to_list(50)
    
    for poll in polls:
        if '_id' in poll:
            del poll['_id']
    
    return polls

@api_router.post("/polls/{poll_id}/vote")
async def vote_on_poll(poll_id: str, option_id: str, current_user: dict = Depends(get_current_user)):
    poll = await db.polls.find_one({"id": poll_id})
    if not poll:
        raise HTTPException(status_code=404, detail="Anket bulunamadı")
    
    if not poll.get('multipleChoice', False):
        await db.polls.update_one(
            {"id": poll_id},
            {"$pull": {"options.$[].votes": current_user['uid']}}
        )
    
    await db.polls.update_one(
        {"id": poll_id, "options.id": option_id},
        {"$addToSet": {"options.$.votes": current_user['uid']}}
    )
    
    return {"message": "Oyunuz kaydedildi"}

@api_router.post("/admin/groups/{group_id}/admins/{user_id}")
async def add_group_admin(group_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    is_creator = group.get('createdBy') == current_user['uid']
    
    if not is_global_admin and not is_creator:
        raise HTTPException(status_code=403, detail="Sadece genel yönetici veya grup kurucusu yönetici ekleyebilir")
    
    await db.groups.update_one(
        {"id": group_id},
        {"$addToSet": {"admins": user_id, "members": user_id}}
    )
    
    await db.users.update_one(
        {"uid": user_id},
        {"$addToSet": {"groups": group_id}}
    )
    
    return {"message": "Kullanıcı yönetici olarak eklendi"}

@api_router.delete("/admin/groups/{group_id}/admins/{user_id}")
async def remove_group_admin(group_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    is_creator = group.get('createdBy') == current_user['uid']
    
    if not is_global_admin and not is_creator:
        raise HTTPException(status_code=403, detail="Yetkiniz yok")
    
    target_user = await db.users.find_one({"uid": user_id})
    if target_user and (target_user.get('isAdmin', False) or target_user.get('email', '').lower() == ADMIN_EMAIL.lower()):
        raise HTTPException(status_code=400, detail="Genel yöneticiyi gruptan kaldıramazsınız")
    
    await db.groups.update_one(
        {"id": group_id},
        {"$pull": {"admins": user_id}}
    )
    
    return {"message": "Yönetici yetkisi kaldırıldı"}

@api_router.get("/user/my-groups")
async def get_my_groups(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    group_ids = user.get('groups', [])
    groups = await db.groups.find({"id": {"$in": group_ids}}).to_list(100)
    
    for group in groups:
        if '_id' in group:
            del group['_id']
        group['isAdmin'] = current_user['uid'] in group.get('admins', [])
        group['memberCount'] = len(group.get('members', []))
    
    return clean_doc(groups)

@api_router.post("/groups/{group_id}/join")
async def join_group(group_id: str, current_user: dict = Depends(get_current_user)):
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    if current_user['uid'] in group.get('bannedUsers', []):
        raise HTTPException(status_code=403, detail="Bu gruptan yasaklandınız")
    
    await db.groups.update_one(
        {"id": group_id},
        {"$addToSet": {"members": current_user['uid']}}
    )
    
    await db.users.update_one(
        {"uid": current_user['uid']},
        {"$addToSet": {"groups": group_id}}
    )
    
    return {"message": "Gruba katıldınız"}

# ==================== COMMUNITY (TOPLULUK) API'LERİ ====================

# Varsayılan alt grup tipleri ve sıraları
DEFAULT_SUBGROUPS = [
    {"name": "Start", "description": "Yeni üyeler için başlangıç grubu", "level": 1, "icon": "🚀"},
    {"name": "Gelişim", "description": "Gelişmekte olan üyeler grubu", "level": 2, "icon": "📈"},
    {"name": "Değerlendirme", "description": "Değerlendirme aşamasındaki üyeler", "level": 3, "icon": "⭐"},
    {"name": "Ana Grup", "description": "Ana üyeler grubu", "level": 4, "icon": "👑"}
]

# 81 şehir için toplulukları oluştur (uygulama başlatıldığında çalışır)
async def initialize_city_communities():
    """81 şehir için toplulukları oluşturur"""
    admin_user = await db.users.find_one({"email": ADMIN_EMAIL})
    admin_uid = admin_user['uid'] if admin_user else "system"
    admin_name = f"{admin_user['firstName']} {admin_user['lastName']}" if admin_user else "System"
    
    for city in TURKISH_CITIES:
        existing = await db.communities.find_one({"city": city})
        if not existing:
            community_id = f"community-{city.lower().replace('ı', 'i').replace('ö', 'o').replace('ü', 'u').replace('ş', 's').replace('ç', 'c').replace('ğ', 'g').replace(' ', '-')}"
            
            # Duyuru kanalı oluştur
            announcement_id = f"announcement-{community_id}"
            announcement_channel = {
                "id": announcement_id,
                "communityId": community_id,
                "name": f"{city} Duyuruları",
                "description": "Sadece yöneticilerin mesaj atabileceği duyuru kanalı",
                "createdAt": datetime.utcnow()
            }
            await db.announcement_channels.insert_one(announcement_channel)
            
            subgroup_ids = []
            
            # 4 varsayılan alt grup oluştur
            for sg_template in DEFAULT_SUBGROUPS:
                sg_id = f"subgroup-{community_id}-{sg_template['name'].lower().replace(' ', '-').replace('ı', 'i').replace('ş', 's').replace('ğ', 'g')}"
                subgroup = {
                    "id": sg_id,
                    "communityId": community_id,
                    "name": f"{sg_template['icon']} {sg_template['name']}",
                    "description": f"{city} - {sg_template['description']}",
                    "imageUrl": None,
                    "level": sg_template['level'],
                    "groupAdmins": [admin_uid] if admin_uid != "system" else [],
                    "members": [admin_uid] if admin_uid != "system" and sg_template['level'] == 1 else [],
                    "pendingRequests": [],
                    "isPublic": sg_template['level'] == 1,  # Sadece Start grubu herkese açık
                    "createdBy": admin_uid,
                    "createdByName": admin_name,
                    "createdAt": datetime.utcnow()
                }
                await db.subgroups.insert_one(subgroup)
                subgroup_ids.append(sg_id)
            
            # Topluluk oluştur
            new_community = {
                "id": community_id,
                "name": f"{city} Network Topluluğu",
                "description": f"{city} ili girişimciler ve profesyoneller topluluğu",
                "city": city,
                "imageUrl": f"https://ui-avatars.com/api/?name={city}&background=4A90E2&color=fff&size=200",
                "coverImageUrl": None,
                "superAdmins": [admin_uid] if admin_uid != "system" else [],
                "members": [admin_uid] if admin_uid != "system" else [],
                "subGroups": subgroup_ids,
                "announcementChannelId": announcement_id,
                "createdBy": admin_uid,
                "createdByName": admin_name,
                "createdAt": datetime.utcnow()
            }
            await db.communities.insert_one(new_community)
        else:
            # Mevcut toplulukları güncelle - eksik alt grupları ekle
            community_id = existing['id']
            existing_subgroups = await db.subgroups.find({"communityId": community_id}).to_list(10)
            existing_names = [sg.get('name', '').replace('🚀 ', '').replace('📈 ', '').replace('⭐ ', '').replace('👑 ', '') for sg in existing_subgroups]
            
            for sg_template in DEFAULT_SUBGROUPS:
                if sg_template['name'] not in existing_names:
                    sg_id = f"subgroup-{community_id}-{sg_template['name'].lower().replace(' ', '-').replace('ı', 'i').replace('ş', 's').replace('ğ', 'g')}"
                    subgroup = {
                        "id": sg_id,
                        "communityId": community_id,
                        "name": f"{sg_template['icon']} {sg_template['name']}",
                        "description": f"{existing['city']} - {sg_template['description']}",
                        "imageUrl": None,
                        "level": sg_template['level'],
                        "groupAdmins": existing.get('superAdmins', []),
                        "members": [],
                        "pendingRequests": [],
                        "isPublic": sg_template['level'] == 1,
                        "createdBy": admin_uid,
                        "createdByName": admin_name,
                        "createdAt": datetime.utcnow()
                    }
                    await db.subgroups.insert_one(subgroup)
                    await db.communities.update_one(
                        {"id": community_id},
                        {"$addToSet": {"subGroups": sg_id}}
                    )
    
    logging.info("✅ Şehir toplulukları başarıyla kontrol edildi/oluşturuldu")

# Tüm toplulukları getir
@api_router.get("/communities")
async def get_all_communities(current_user: dict = Depends(get_current_user)):
    communities = await db.communities.find().sort("name", 1).to_list(100)
    
    for community in communities:
        if '_id' in community:
            del community['_id']
        community['memberCount'] = len(community.get('members', []))
        community['isMember'] = current_user['uid'] in community.get('members', [])
        community['isSuperAdmin'] = current_user['uid'] in community.get('superAdmins', [])
        community['subGroupCount'] = len(community.get('subGroups', []))
    
    return clean_doc(communities)

# Kullanıcının topluluklarını getir
@api_router.get("/communities/my")
async def get_my_communities(current_user: dict = Depends(get_current_user)):
    communities = await db.communities.find({"members": current_user['uid']}).sort("name", 1).to_list(100)
    
    for community in communities:
        if '_id' in community:
            del community['_id']
        community['memberCount'] = len(community.get('members', []))
        community['isSuperAdmin'] = current_user['uid'] in community.get('superAdmins', [])
        community['subGroupCount'] = len(community.get('subGroups', []))
    
    return clean_doc(communities)

# Tek topluluk detayı
@api_router.get("/communities/{community_id}")
async def get_community(community_id: str, current_user: dict = Depends(get_current_user)):
    community = await db.communities.find_one({"id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    if '_id' in community:
        del community['_id']
    
    community['memberCount'] = len(community.get('members', []))
    community['isMember'] = current_user['uid'] in community.get('members', [])
    community['isSuperAdmin'] = current_user['uid'] in community.get('superAdmins', [])
    
    # Alt grupları seviyeye göre sıralı getir
    subgroups = await db.subgroups.find({"communityId": community_id}).sort("level", 1).to_list(50)
    for sg in subgroups:
        if '_id' in sg:
            del sg['_id']
        sg['memberCount'] = len(sg.get('members', []))
        sg['isMember'] = current_user['uid'] in sg.get('members', [])
        sg['isGroupAdmin'] = current_user['uid'] in sg.get('groupAdmins', [])
        sg['hasPendingRequest'] = any(r.get('userId') == current_user['uid'] and r.get('status') == 'pending' for r in sg.get('pendingRequests', []))
    
    community['subGroupsList'] = subgroups
    
    return clean_doc(community)

# Topluluğa katıl
@api_router.post("/communities/{community_id}/join")
async def join_community(community_id: str, current_user: dict = Depends(get_current_user)):
    community = await db.communities.find_one({"id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    await db.communities.update_one(
        {"id": community_id},
        {"$addToSet": {"members": current_user['uid']}}
    )
    
    await db.users.update_one(
        {"uid": current_user['uid']},
        {"$addToSet": {"communities": community_id}}
    )
    
    # Kullanıcıyı Start grubuna otomatik ekle
    start_subgroup = await db.subgroups.find_one({
        "communityId": community_id,
        "level": 1
    })
    if start_subgroup:
        await db.subgroups.update_one(
            {"id": start_subgroup['id']},
            {"$addToSet": {"members": current_user['uid']}}
        )
    
    return {"message": "Topluluğa katıldınız"}

# Topluluktan ayrıl
@api_router.post("/communities/{community_id}/leave")
async def leave_community(community_id: str, current_user: dict = Depends(get_current_user)):
    community = await db.communities.find_one({"id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    # Süper admin topluluktan ayrılamaz
    if current_user['uid'] in community.get('superAdmins', []):
        raise HTTPException(status_code=400, detail="Süper yönetici topluluktan ayrılamaz")
    
    await db.communities.update_one(
        {"id": community_id},
        {"$pull": {"members": current_user['uid']}}
    )
    
    await db.users.update_one(
        {"uid": current_user['uid']},
        {"$pull": {"communities": community_id}}
    )
    
    # Alt gruplardan da çıkar
    await db.subgroups.update_many(
        {"communityId": community_id},
        {"$pull": {"members": current_user['uid'], "groupAdmins": current_user['uid']}}
    )
    
    return {"message": "Topluluktan ayrıldınız"}

# ==================== ÜYE YÜKSELTME API'LERİ ====================

# Üyeyi bir üst seviye gruba yükselt
@api_router.post("/subgroups/{subgroup_id}/promote/{user_id}")
async def promote_member(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    community = await db.communities.find_one({"id": subgroup['communityId']})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    # Yetki kontrolü
    user = await db.users.find_one({"uid": current_user['uid']})
    is_super_admin = current_user['uid'] in community.get('superAdmins', [])
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_super_admin and not is_group_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    # Mevcut seviye
    current_level = subgroup.get('level', 1)
    
    # Bir üst seviye grubu bul
    next_subgroup = await db.subgroups.find_one({
        "communityId": subgroup['communityId'],
        "level": current_level + 1
    })
    
    if not next_subgroup:
        raise HTTPException(status_code=400, detail="Üst seviye grup bulunamadı")
    
    # Üyeyi mevcut gruptan çıkar ve üst gruba ekle
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$pull": {"members": user_id}}
    )
    
    await db.subgroups.update_one(
        {"id": next_subgroup['id']},
        {"$addToSet": {"members": user_id}}
    )
    
    return {"message": f"Üye {next_subgroup['name']} grubuna yükseltildi", "newGroupId": next_subgroup['id']}

# Üyeyi bir alt seviye gruba düşür
@api_router.post("/subgroups/{subgroup_id}/demote/{user_id}")
async def demote_member(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    community = await db.communities.find_one({"id": subgroup['communityId']})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    # Yetki kontrolü
    user = await db.users.find_one({"uid": current_user['uid']})
    is_super_admin = current_user['uid'] in community.get('superAdmins', [])
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_super_admin and not is_group_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    # Mevcut seviye
    current_level = subgroup.get('level', 1)
    
    if current_level <= 1:
        raise HTTPException(status_code=400, detail="Üye zaten en alt seviyede")
    
    # Bir alt seviye grubu bul
    prev_subgroup = await db.subgroups.find_one({
        "communityId": subgroup['communityId'],
        "level": current_level - 1
    })
    
    if not prev_subgroup:
        raise HTTPException(status_code=400, detail="Alt seviye grup bulunamadı")
    
    # Üyeyi mevcut gruptan çıkar ve alt gruba ekle
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$pull": {"members": user_id}}
    )
    
    await db.subgroups.update_one(
        {"id": prev_subgroup['id']},
        {"$addToSet": {"members": user_id}}
    )
    
    return {"message": f"Üye {prev_subgroup['name']} grubuna düşürüldü", "newGroupId": prev_subgroup['id']}

# Alt grup bilgilerini güncelle (foto, açıklama)
@api_router.put("/subgroups/{subgroup_id}")
async def update_subgroup(subgroup_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    community = await db.communities.find_one({"id": subgroup['communityId']})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    # Yetki kontrolü
    user = await db.users.find_one({"uid": current_user['uid']})
    is_super_admin = current_user['uid'] in community.get('superAdmins', [])
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_super_admin and not is_group_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    # Güncellenebilir alanlar
    allowed_fields = ['name', 'description', 'imageUrl']
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if update_data:
        await db.subgroups.update_one(
            {"id": subgroup_id},
            {"$set": update_data}
        )
    
    return {"message": "Alt grup güncellendi"}

# Gruba yönetici ekle
@api_router.post("/subgroups/{subgroup_id}/add-admin/{user_id}")
async def add_subgroup_admin(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    community = await db.communities.find_one({"id": subgroup['communityId']})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    # Yetki kontrolü - sadece süper admin ve global admin
    user = await db.users.find_one({"uid": current_user['uid']})
    is_super_admin = current_user['uid'] in community.get('superAdmins', [])
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_super_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Sadece süper yöneticiler admin ekleyebilir")
    
    # Kullanıcının var olduğunu kontrol et
    target_user = await db.users.find_one({"uid": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Admin olarak ekle ve üye olarak da ekle
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$addToSet": {"groupAdmins": user_id, "members": user_id}}
    )
    
    return {"message": f"{target_user['firstName']} {target_user['lastName']} yönetici olarak eklendi"}

# Gruptan yönetici çıkar
@api_router.post("/subgroups/{subgroup_id}/remove-admin/{user_id}")
async def remove_subgroup_admin(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    community = await db.communities.find_one({"id": subgroup['communityId']})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    # Yetki kontrolü
    user = await db.users.find_one({"uid": current_user['uid']})
    is_super_admin = current_user['uid'] in community.get('superAdmins', [])
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_super_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Sadece süper yöneticiler admin çıkarabilir")
    
    # Kendini çıkaramaz
    if user_id == current_user['uid']:
        raise HTTPException(status_code=400, detail="Kendinizi yöneticilikten çıkaramazsınız")
    
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$pull": {"groupAdmins": user_id}}
    )
    
    return {"message": "Yönetici yetkisi alındı"}

# Gruba katılma isteği gönder
@api_router.post("/subgroups/{subgroup_id}/request-join")
async def request_join_subgroup(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    # Zaten üye mi kontrol et
    if current_user['uid'] in subgroup.get('members', []):
        raise HTTPException(status_code=400, detail="Zaten bu grubun üyesisiniz")
    
    # Zaten bekleyen istek var mı
    pending_requests = subgroup.get('pendingRequests', [])
    if any(r.get('userId') == current_user['uid'] and r.get('status') == 'pending' for r in pending_requests):
        raise HTTPException(status_code=400, detail="Zaten bekleyen bir isteğiniz var")
    
    # Kullanıcı bilgilerini al
    user = await db.users.find_one({"uid": current_user['uid']})
    user_name = f"{user['firstName']} {user['lastName']}" if user else "Bilinmeyen"
    
    # Yeni istek oluştur
    new_request = {
        "id": str(uuid.uuid4()),
        "userId": current_user['uid'],
        "userName": user_name,
        "userImage": user.get('profileImageUrl') if user else None,
        "userCity": user.get('city', '') if user else '',
        "status": "pending",
        "createdAt": datetime.utcnow().isoformat()
    }
    
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$push": {"pendingRequests": new_request}}
    )
    
    return {"message": "Katılma isteği gönderildi"}

# Bekleyen istekleri getir
@api_router.get("/subgroups/{subgroup_id}/pending-requests")
async def get_pending_requests(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    community = await db.communities.find_one({"id": subgroup['communityId']})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    # Yetki kontrolü
    user = await db.users.find_one({"uid": current_user['uid']})
    is_super_admin = current_user['uid'] in community.get('superAdmins', [])
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_super_admin and not is_group_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    pending = [r for r in subgroup.get('pendingRequests', []) if r.get('status') == 'pending']
    return pending

# Katılma isteğini onayla
@api_router.post("/subgroups/{subgroup_id}/approve-request/{request_id}")
async def approve_join_request(subgroup_id: str, request_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    community = await db.communities.find_one({"id": subgroup['communityId']})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    # Yetki kontrolü
    user = await db.users.find_one({"uid": current_user['uid']})
    is_super_admin = current_user['uid'] in community.get('superAdmins', [])
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_super_admin and not is_group_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    # İsteği bul
    pending_requests = subgroup.get('pendingRequests', [])
    request = next((r for r in pending_requests if r.get('id') == request_id), None)
    
    if not request:
        raise HTTPException(status_code=404, detail="İstek bulunamadı")
    
    if request.get('status') != 'pending':
        raise HTTPException(status_code=400, detail="Bu istek zaten işlenmiş")
    
    user_id = request['userId']
    
    # Üye olarak ekle
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$addToSet": {"members": user_id}}
    )
    
    # İstek durumunu güncelle
    await db.subgroups.update_one(
        {"id": subgroup_id, "pendingRequests.id": request_id},
        {"$set": {"pendingRequests.$.status": "approved"}}
    )
    
    return {"message": "Katılma isteği onaylandı"}

# Katılma isteğini reddet
@api_router.post("/subgroups/{subgroup_id}/reject-request/{request_id}")
async def reject_join_request(subgroup_id: str, request_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    community = await db.communities.find_one({"id": subgroup['communityId']})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    # Yetki kontrolü
    user = await db.users.find_one({"uid": current_user['uid']})
    is_super_admin = current_user['uid'] in community.get('superAdmins', [])
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_super_admin and not is_group_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    # İsteği bul ve durumunu güncelle
    await db.subgroups.update_one(
        {"id": subgroup_id, "pendingRequests.id": request_id},
        {"$set": {"pendingRequests.$.status": "rejected"}}
    )
    
    return {"message": "Katılma isteği reddedildi"}

# Kullanıcıyı direkt gruba ekle (yönetici tarafından)
@api_router.post("/subgroups/{subgroup_id}/add-member/{user_id}")
async def add_member_to_subgroup(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    community = await db.communities.find_one({"id": subgroup['communityId']})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    # Yetki kontrolü
    user = await db.users.find_one({"uid": current_user['uid']})
    is_super_admin = current_user['uid'] in community.get('superAdmins', [])
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_super_admin and not is_group_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    # Kullanıcıyı ekle
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$addToSet": {"members": user_id}}
    )
    
    return {"message": "Üye eklendi"}

# Kullanıcıyı gruptan çıkar
@api_router.post("/subgroups/{subgroup_id}/remove-member/{user_id}")
async def remove_member_from_subgroup(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    community = await db.communities.find_one({"id": subgroup['communityId']})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    # Yetki kontrolü
    user = await db.users.find_one({"uid": current_user['uid']})
    is_super_admin = current_user['uid'] in community.get('superAdmins', [])
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_super_admin and not is_group_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    # Süper admin çıkarılamaz
    if user_id in community.get('superAdmins', []):
        raise HTTPException(status_code=400, detail="Süper yönetici gruptan çıkarılamaz")
    
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$pull": {"members": user_id, "groupAdmins": user_id}}
    )
    
    return {"message": "Üye gruptan çıkarıldı"}

# Alt grup üyelerini getir
@api_router.get("/subgroups/{subgroup_id}/members")
async def get_subgroup_members(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    member_ids = subgroup.get('members', [])
    members = await db.users.find({"uid": {"$in": member_ids}}).to_list(1000)
    
    for member in members:
        member.pop('_id', None)
        member['isGroupAdmin'] = member['uid'] in subgroup.get('groupAdmins', [])
    
    return clean_doc(members)

# ==================== ALT GRUP API'LERİ ====================

# Topluluğa alt grup ekle (sadece süper admin)
@api_router.post("/communities/{community_id}/subgroups")
async def create_subgroup(community_id: str, subgroup_data: dict, current_user: dict = Depends(get_current_user)):
    community = await db.communities.find_one({"id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    # Süper admin kontrolü
    user = await db.users.find_one({"uid": current_user['uid']})
    is_super_admin = current_user['uid'] in community.get('superAdmins', [])
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_super_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için süper yönetici yetkisi gerekiyor")
    
    subgroup_id = str(uuid.uuid4())
    new_subgroup = {
        "id": subgroup_id,
        "communityId": community_id,
        "name": subgroup_data['name'],
        "description": subgroup_data.get('description', ''),
        "imageUrl": subgroup_data.get('imageUrl'),
        "groupAdmins": [current_user['uid']],
        "members": [current_user['uid']],
        "pendingRequests": [],
        "isPublic": subgroup_data.get('isPublic', True),
        "createdBy": current_user['uid'],
        "createdByName": f"{user['firstName']} {user['lastName']}",
        "createdAt": datetime.utcnow()
    }
    
    await db.subgroups.insert_one(new_subgroup)
    
    # Topluluğa alt grup ID'sini ekle
    await db.communities.update_one(
        {"id": community_id},
        {"$addToSet": {"subGroups": subgroup_id}}
    )
    
    if '_id' in new_subgroup:
        del new_subgroup['_id']
    
    return new_subgroup

# Alt grup detayı
@api_router.get("/subgroups/{subgroup_id}")
async def get_subgroup(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    if '_id' in subgroup:
        del subgroup['_id']
    
    subgroup['memberCount'] = len(subgroup.get('members', []))
    subgroup['isMember'] = current_user['uid'] in subgroup.get('members', [])
    subgroup['isGroupAdmin'] = current_user['uid'] in subgroup.get('groupAdmins', [])
    
    # Topluluk bilgisi
    community = await db.communities.find_one({"id": subgroup['communityId']})
    if community:
        subgroup['communityName'] = community['name']
        subgroup['isSuperAdmin'] = current_user['uid'] in community.get('superAdmins', [])
    
    return subgroup

# Alt gruba katılma isteği gönder
@api_router.post("/subgroups/{subgroup_id}/request-join")
async def request_join_subgroup(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    # Zaten üye mi kontrol et
    if current_user['uid'] in subgroup.get('members', []):
        raise HTTPException(status_code=400, detail="Zaten bu grubun üyesisiniz")
    
    # Bekleyen istek var mı kontrol et
    pending = [r for r in subgroup.get('pendingRequests', []) if r.get('userId') == current_user['uid'] and r.get('status') == 'pending']
    if pending:
        raise HTTPException(status_code=400, detail="Zaten bekleyen bir isteğiniz var")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    
    # Eğer grup herkese açıksa direkt katıl
    if subgroup.get('isPublic', True):
        await db.subgroups.update_one(
            {"id": subgroup_id},
            {"$addToSet": {"members": current_user['uid']}}
        )
        return {"message": "Gruba katıldınız", "status": "joined"}
    
    # Değilse istek oluştur
    join_request = {
        "id": str(uuid.uuid4()),
        "userId": current_user['uid'],
        "userName": f"{user['firstName']} {user['lastName']}",
        "userProfileImage": user.get('profileImageUrl'),
        "status": "pending",
        "createdAt": datetime.utcnow()
    }
    
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$push": {"pendingRequests": join_request}}
    )
    
    return {"message": "Katılma isteği gönderildi", "status": "pending"}

# Katılma isteğini onayla/reddet (grup yöneticisi veya süper admin)
@api_router.post("/subgroups/{subgroup_id}/requests/{request_id}/{action}")
async def handle_join_request(subgroup_id: str, request_id: str, action: str, current_user: dict = Depends(get_current_user)):
    if action not in ['approve', 'reject']:
        raise HTTPException(status_code=400, detail="Geçersiz işlem")
    
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    # Yetki kontrolü
    community = await db.communities.find_one({"id": subgroup['communityId']})
    user = await db.users.find_one({"uid": current_user['uid']})
    
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    is_super_admin = current_user['uid'] in community.get('superAdmins', []) if community else False
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_group_admin and not is_super_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    # İsteği bul
    request = next((r for r in subgroup.get('pendingRequests', []) if r.get('id') == request_id), None)
    if not request:
        raise HTTPException(status_code=404, detail="İstek bulunamadı")
    
    if action == 'approve':
        # Üye olarak ekle
        await db.subgroups.update_one(
            {"id": subgroup_id},
            {"$addToSet": {"members": request['userId']}}
        )
        # İsteği güncelle
        await db.subgroups.update_one(
            {"id": subgroup_id, "pendingRequests.id": request_id},
            {"$set": {"pendingRequests.$.status": "approved"}}
        )
        return {"message": "İstek onaylandı"}
    else:
        # İsteği reddet
        await db.subgroups.update_one(
            {"id": subgroup_id, "pendingRequests.id": request_id},
            {"$set": {"pendingRequests.$.status": "rejected"}}
        )
        return {"message": "İstek reddedildi"}

# Alt gruptan ayrıl
@api_router.post("/subgroups/{subgroup_id}/leave")
async def leave_subgroup(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$pull": {"members": current_user['uid'], "groupAdmins": current_user['uid']}}
    )
    
    return {"message": "Gruptan ayrıldınız"}

# Alt grup sil (sadece süper admin)
@api_router.delete("/subgroups/{subgroup_id}")
async def delete_subgroup(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    community = await db.communities.find_one({"id": subgroup['communityId']})
    user = await db.users.find_one({"uid": current_user['uid']})
    
    is_super_admin = current_user['uid'] in community.get('superAdmins', []) if community else False
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_super_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için süper yönetici yetkisi gerekiyor")
    
    # Alt grubu sil
    await db.subgroups.delete_one({"id": subgroup_id})
    
    # Topluluktan ID'yi kaldır
    await db.communities.update_one(
        {"id": subgroup['communityId']},
        {"$pull": {"subGroups": subgroup_id}}
    )
    
    # Alt grup mesajlarını sil
    await db.messages.delete_many({"groupId": subgroup_id})
    
    return {"message": "Alt grup silindi"}

# ==================== DUYURU KANALI API'LERİ ====================

# Duyuru kanalı mesajlarını getir
@api_router.get("/communities/{community_id}/announcements")
async def get_announcements(community_id: str, current_user: dict = Depends(get_current_user)):
    community = await db.communities.find_one({"id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    announcement_channel_id = community.get('announcementChannelId')
    if not announcement_channel_id:
        return []
    
    messages = await db.messages.find({"groupId": announcement_channel_id}).sort("timestamp", -1).limit(50).to_list(50)
    
    for msg in messages:
        if '_id' in msg:
            del msg['_id']
    
    return clean_doc(messages)

# Duyuru gönder (sadece süper admin)
@api_router.post("/communities/{community_id}/announcements")
async def send_announcement(community_id: str, message_data: dict, current_user: dict = Depends(get_current_user)):
    community = await db.communities.find_one({"id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    # Süper admin kontrolü
    user = await db.users.find_one({"uid": current_user['uid']})
    is_super_admin = current_user['uid'] in community.get('superAdmins', [])
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_super_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Sadece süper yöneticiler duyuru gönderebilir")
    
    announcement_channel_id = community.get('announcementChannelId')
    
    new_message = {
        "id": str(uuid.uuid4()),
        "groupId": announcement_channel_id,
        "senderId": current_user['uid'],
        "senderName": f"{user['firstName']} {user['lastName']}",
        "content": message_data.get('content', ''),
        "type": "announcement",
        "timestamp": datetime.utcnow()
    }
    
    await db.messages.insert_one(new_message)
    
    # Socket.IO ile bildirim gönder
    await sio.emit('new_announcement', {
        "communityId": community_id,
        "message": new_message
    }, room=community_id)
    
    if '_id' in new_message:
        del new_message['_id']
    
    return new_message

# ==================== ALT GRUP MESAJLAŞMA ====================

# Alt grup mesajlarını getir
@api_router.get("/subgroups/{subgroup_id}/messages")
async def get_subgroup_messages(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    # Üyelik kontrolü
    if current_user['uid'] not in subgroup.get('members', []):
        raise HTTPException(status_code=403, detail="Bu grubun üyesi değilsiniz")
    
    messages = await db.messages.find({
        "groupId": subgroup_id,
        "deletedForEveryone": {"$ne": True},
        "deletedFor": {"$nin": [current_user['uid']]}
    }).sort("timestamp", -1).limit(100).to_list(100)
    
    for msg in messages:
        if '_id' in msg:
            del msg['_id']
        # Kullanıcı için silinmiş mesajları işaretle
        if current_user['uid'] in msg.get('deletedFor', []):
            msg['isDeleted'] = True
            msg['content'] = 'Bu mesaj silindi'
    
    # Mesajları okundu olarak işaretle
    await db.messages.update_many(
        {
            "groupId": subgroup_id,
            "senderId": {"$ne": current_user['uid']},
            "readBy": {"$nin": [current_user['uid']]}
        },
        {"$addToSet": {"readBy": current_user['uid']}, "$set": {"status": "read"}}
    )
    
    return clean_doc(messages)

# Alt gruba mesaj gönder
@api_router.post("/subgroups/{subgroup_id}/messages")
async def send_subgroup_message(subgroup_id: str, message_data: dict, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    # Üyelik kontrolü
    if current_user['uid'] not in subgroup.get('members', []):
        raise HTTPException(status_code=403, detail="Bu grubun üyesi değilsiniz")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    
    # Yanıtlanan mesaj bilgisi
    reply_content = None
    reply_sender_name = None
    if message_data.get('replyTo'):
        reply_msg = await db.messages.find_one({"id": message_data['replyTo']})
        if reply_msg:
            reply_content = reply_msg.get('content', '')[:100]  # İlk 100 karakter
            reply_sender_name = reply_msg.get('senderName', '')
    
    new_message = {
        "id": str(uuid.uuid4()),
        "groupId": subgroup_id,
        "senderId": current_user['uid'],
        "senderName": f"{user['firstName']} {user['lastName']}",
        "senderProfileImage": user.get('profileImageUrl'),
        "content": message_data.get('content', ''),
        "type": message_data.get('type', 'text'),
        "fileUrl": message_data.get('fileUrl'),
        "fileName": message_data.get('fileName'),
        "fileSize": message_data.get('fileSize'),
        "fileMimeType": message_data.get('fileMimeType'),
        "replyTo": message_data.get('replyTo'),
        "replyToContent": reply_content,
        "replyToSenderName": reply_sender_name,
        "reactions": [],
        "isPinned": False,
        "isDeleted": False,
        "deletedForEveryone": False,
        "deletedFor": [],
        "isEdited": False,
        "editHistory": [],
        "status": "sent",
        "deliveredTo": [],
        "readBy": [current_user['uid']],  # Gönderen okumuş sayılır
        "timestamp": datetime.utcnow()
    }
    
    await db.messages.insert_one(new_message)
    
    # Socket.IO ile mesaj gönder
    if '_id' in new_message:
        del new_message['_id']
    await sio.emit('new_subgroup_message', new_message, room=subgroup_id)
    
    return new_message

# Mesaja emoji reaksiyon ekle/kaldır
@api_router.post("/subgroups/{subgroup_id}/messages/{message_id}/react")
async def toggle_message_reaction(subgroup_id: str, message_id: str, reaction_data: dict, current_user: dict = Depends(get_current_user)):
    message = await db.messages.find_one({"id": message_id, "groupId": subgroup_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    user = await db.users.find_one({"uid": current_user['uid']})
    emoji = reaction_data.get('emoji')
    
    if not emoji:
        raise HTTPException(status_code=400, detail="Emoji gerekli")
    
    reactions = message.get('reactions', [])
    
    # Aynı kullanıcının aynı emojisi var mı kontrol et
    existing_reaction = next(
        (r for r in reactions if r.get('userId') == current_user['uid'] and r.get('emoji') == emoji), 
        None
    )
    
    if existing_reaction:
        # Reaksiyonu kaldır
        reactions = [r for r in reactions if not (r.get('userId') == current_user['uid'] and r.get('emoji') == emoji)]
    else:
        # Reaksiyon ekle
        reactions.append({
            "emoji": emoji,
            "userId": current_user['uid'],
            "userName": f"{user['firstName']} {user['lastName']}",
            "timestamp": datetime.utcnow()
        })
    
    await db.messages.update_one(
        {"id": message_id},
        {"$set": {"reactions": reactions}}
    )
    
    # Socket.IO ile bildir
    await sio.emit('message_reaction_update', {
        "messageId": message_id,
        "reactions": reactions
    }, room=subgroup_id)
    
    return {"reactions": reactions}

# Mesajı düzenle
@api_router.put("/subgroups/{subgroup_id}/messages/{message_id}")
async def edit_message(subgroup_id: str, message_id: str, edit_data: dict, current_user: dict = Depends(get_current_user)):
    message = await db.messages.find_one({"id": message_id, "groupId": subgroup_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    # Sadece mesaj sahibi düzenleyebilir
    if message['senderId'] != current_user['uid']:
        raise HTTPException(status_code=403, detail="Sadece kendi mesajınızı düzenleyebilirsiniz")
    
    new_content = edit_data.get('content', '').strip()
    if not new_content:
        raise HTTPException(status_code=400, detail="Mesaj içeriği boş olamaz")
    
    # Düzenleme geçmişine ekle
    edit_history = message.get('editHistory', [])
    edit_history.append({
        "content": message['content'],
        "editedAt": datetime.utcnow()
    })
    
    await db.messages.update_one(
        {"id": message_id},
        {
            "$set": {
                "content": new_content,
                "isEdited": True,
                "editedAt": datetime.utcnow(),
                "editHistory": edit_history
            }
        }
    )
    
    # Socket.IO ile bildir
    await sio.emit('message_edited', {
        "messageId": message_id,
        "content": new_content,
        "isEdited": True,
        "editedAt": datetime.utcnow().isoformat()
    }, room=subgroup_id)
    
    return {"message": "Mesaj düzenlendi", "content": new_content}

# Mesajı sil (benden sil)
@api_router.delete("/subgroups/{subgroup_id}/messages/{message_id}/delete-for-me")
async def delete_message_for_me_subgroup(subgroup_id: str, message_id: str, current_user: dict = Depends(get_current_user)):
    message = await db.messages.find_one({"id": message_id, "groupId": subgroup_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    await db.messages.update_one(
        {"id": message_id},
        {"$addToSet": {"deletedFor": current_user['uid']}}
    )
    
    return {"message": "Mesaj sizin için silindi"}

# Mesajı sil (herkesten sil)
@api_router.delete("/subgroups/{subgroup_id}/messages/{message_id}/delete-for-everyone")
async def delete_message_for_everyone_subgroup(subgroup_id: str, message_id: str, current_user: dict = Depends(get_current_user)):
    message = await db.messages.find_one({"id": message_id, "groupId": subgroup_id})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    # Sadece mesaj sahibi veya admin herkesten silebilir
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    community = await db.communities.find_one({"id": subgroup.get('communityId')}) if subgroup else None
    user = await db.users.find_one({"uid": current_user['uid']})
    
    is_sender = message['senderId'] == current_user['uid']
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', []) if subgroup else False
    is_super_admin = current_user['uid'] in community.get('superAdmins', []) if community else False
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_sender and not is_group_admin and not is_super_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu mesajı silme yetkiniz yok")
    
    await db.messages.update_one(
        {"id": message_id},
        {
            "$set": {
                "deletedForEveryone": True,
                "isDeleted": True,
                "content": "Bu mesaj silindi"
            }
        }
    )
    
    # Socket.IO ile bildir
    await sio.emit('message_deleted', {
        "messageId": message_id,
        "deletedForEveryone": True
    }, room=subgroup_id)
    
    return {"message": "Mesaj herkesten silindi"}

# Yazıyor durumunu bildir
@api_router.post("/subgroups/{subgroup_id}/typing")
async def notify_typing(subgroup_id: str, typing_data: dict, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    is_typing = typing_data.get('isTyping', False)
    
    await sio.emit('user_typing', {
        "userId": current_user['uid'],
        "userName": f"{user['firstName']} {user['lastName']}",
        "isTyping": is_typing
    }, room=subgroup_id)
    
    return {"status": "ok"}

# Mesajları okundu olarak işaretle
@api_router.post("/subgroups/{subgroup_id}/messages/mark-read")
async def mark_messages_read(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.messages.update_many(
        {
            "groupId": subgroup_id,
            "senderId": {"$ne": current_user['uid']},
            "readBy": {"$nin": [current_user['uid']]}
        },
        {
            "$addToSet": {"readBy": current_user['uid']},
            "$set": {"status": "read"}
        }
    )
    
    # Socket.IO ile bildir
    await sio.emit('messages_read', {
        "userId": current_user['uid'],
        "groupId": subgroup_id
    }, room=subgroup_id)
    
    return {"markedCount": result.modified_count}

# Dosya yükleme için presigned URL al (S3 simülasyonu - gerçek implementasyonda S3 kullanılır)
@api_router.post("/subgroups/{subgroup_id}/upload-url")
async def get_upload_url(subgroup_id: str, file_data: dict, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    if current_user['uid'] not in subgroup.get('members', []):
        raise HTTPException(status_code=403, detail="Bu grubun üyesi değilsiniz")
    
    # Gerçek implementasyonda S3 presigned URL döndürülür
    # Şimdilik dosya bilgilerini döndür
    file_id = str(uuid.uuid4())
    return {
        "fileId": file_id,
        "uploadUrl": f"/api/files/{file_id}",  # Placeholder
        "fileUrl": f"https://placeholder-cdn.com/files/{file_id}/{file_data.get('fileName', 'file')}",
        "message": "Dosya yükleme özelliği için S3/CDN entegrasyonu gerekiyor"
    }

# ==================== TOPLULUK YÖNETİM API'LERİ ====================

# Topluluk üyelerini getir
@api_router.get("/communities/{community_id}/members")
async def get_community_members(community_id: str, current_user: dict = Depends(get_current_user)):
    community = await db.communities.find_one({"id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    member_ids = community.get('members', [])
    members = await db.users.find({"uid": {"$in": member_ids}}).to_list(1000)
    
    for member in members:
        if '_id' in member:
            del member['_id']
        member['isSuperAdmin'] = member['uid'] in community.get('superAdmins', [])
        # Şifre gibi hassas bilgileri çıkar
        if 'password' in member:
            del member['password']
    
    return members

# Süper admin ekle (sadece global admin)
@api_router.post("/communities/{community_id}/super-admins/{user_id}")
async def add_super_admin(community_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için global yönetici yetkisi gerekiyor")
    
    await db.communities.update_one(
        {"id": community_id},
        {"$addToSet": {"superAdmins": user_id, "members": user_id}}
    )
    
    return {"message": "Süper yönetici eklendi"}

# Süper admin kaldır (sadece global admin)
@api_router.delete("/communities/{community_id}/super-admins/{user_id}")
async def remove_super_admin(community_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için global yönetici yetkisi gerekiyor")
    
    # Global admin'i kaldıramaz
    target_user = await db.users.find_one({"uid": user_id})
    if target_user and (target_user.get('isAdmin', False) or target_user.get('email', '').lower() == ADMIN_EMAIL.lower()):
        raise HTTPException(status_code=400, detail="Global yöneticiyi kaldıramazsınız")
    
    await db.communities.update_one(
        {"id": community_id},
        {"$pull": {"superAdmins": user_id}}
    )
    
    return {"message": "Süper yönetici kaldırıldı"}

# Alt grup yöneticisi ekle
@api_router.post("/subgroups/{subgroup_id}/admins/{user_id}")
async def add_subgroup_admin(subgroup_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    community = await db.communities.find_one({"id": subgroup['communityId']})
    user = await db.users.find_one({"uid": current_user['uid']})
    
    is_super_admin = current_user['uid'] in community.get('superAdmins', []) if community else False
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_super_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için süper yönetici yetkisi gerekiyor")
    
    await db.subgroups.update_one(
        {"id": subgroup_id},
        {"$addToSet": {"groupAdmins": user_id, "members": user_id}}
    )
    
    return {"message": "Grup yöneticisi eklendi"}

# Bekleyen katılma isteklerini getir
@api_router.get("/subgroups/{subgroup_id}/pending-requests")
async def get_pending_requests(subgroup_id: str, current_user: dict = Depends(get_current_user)):
    subgroup = await db.subgroups.find_one({"id": subgroup_id})
    if not subgroup:
        raise HTTPException(status_code=404, detail="Alt grup bulunamadı")
    
    # Yetki kontrolü
    community = await db.communities.find_one({"id": subgroup['communityId']})
    user = await db.users.find_one({"uid": current_user['uid']})
    
    is_group_admin = current_user['uid'] in subgroup.get('groupAdmins', [])
    is_super_admin = current_user['uid'] in community.get('superAdmins', []) if community else False
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_group_admin and not is_super_admin and not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    pending = [r for r in subgroup.get('pendingRequests', []) if r.get('status') == 'pending']
    return pending

# 81 şehir topluluğunu manuel olarak oluştur (bir kerelik)
@api_router.post("/admin/initialize-communities")
async def init_communities(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"uid": current_user['uid']})
    is_global_admin = user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()
    
    if not is_global_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için global yönetici yetkisi gerekiyor")
    
    await initialize_city_communities()
    return {"message": "81 şehir topluluğu başarıyla oluşturuldu"}

# ==================== ADMIN PANEL API'LERİ ====================

# Admin kontrolü decorator
async def check_admin(current_user: dict):
    user = await db.users.find_one({"uid": current_user['uid']})
    if not user:
        return False
    return user.get('isAdmin', False) or user.get('email', '').lower() == ADMIN_EMAIL.lower()

# Admin dashboard istatistikleri
@api_router.get("/admin/dashboard")
async def admin_dashboard(current_user: dict = Depends(get_current_user)):
    if not await check_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    # İstatistikler
    total_users = await db.users.count_documents({})
    total_communities = await db.communities.count_documents({})
    total_subgroups = await db.subgroups.count_documents({})
    total_messages = await db.messages.count_documents({})
    total_posts = await db.posts.count_documents({})
    total_services = await db.services.count_documents({})
    
    # Son 7 günlük kayıt
    from datetime import timedelta
    week_ago = datetime.utcnow() - timedelta(days=7)
    new_users_week = await db.users.count_documents({"createdAt": {"$gte": week_ago}})
    
    # En aktif topluluklar
    communities = await db.communities.find().sort("members", -1).limit(5).to_list(5)
    top_communities = []
    for c in communities:
        top_communities.append({
            "id": c['id'],
            "name": c['name'],
            "city": c['city'],
            "memberCount": len(c.get('members', []))
        })
    
    return {
        "stats": {
            "totalUsers": total_users,
            "totalCommunities": total_communities,
            "totalSubgroups": total_subgroups,
            "totalMessages": total_messages,
            "totalPosts": total_posts,
            "totalServices": total_services,
            "newUsersThisWeek": new_users_week
        },
        "topCommunities": top_communities
    }

# Tüm kullanıcıları getir (admin)
@api_router.get("/admin/users")
async def admin_get_users(current_user: dict = Depends(get_current_user), skip: int = 0, limit: int = 50, search: str = None):
    if not await check_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    query = {}
    if search:
        query = {
            "$or": [
                {"firstName": {"$regex": search, "$options": "i"}},
                {"lastName": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"city": {"$regex": search, "$options": "i"}}
            ]
        }
    
    users = await db.users.find(query).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    for user in users:
        if '_id' in user:
            del user['_id']
        # Hassas bilgileri çıkar
        user.pop('password', None)
    
    return {"users": users, "total": total}

# Kullanıcıyı admin yap/kaldır
@api_router.put("/admin/users/{user_id}/toggle-admin")
async def toggle_user_admin(user_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    user = await db.users.find_one({"uid": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Ana admin değiştirilemez
    if user.get('email', '').lower() == ADMIN_EMAIL.lower():
        raise HTTPException(status_code=400, detail="Ana admin statüsü değiştirilemez")
    
    new_status = not user.get('isAdmin', False)
    await db.users.update_one(
        {"uid": user_id},
        {"$set": {"isAdmin": new_status}}
    )
    
    return {"message": f"Admin durumu {'aktif' if new_status else 'pasif'} yapıldı", "isAdmin": new_status}

# Kullanıcıyı sil
@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    user = await db.users.find_one({"uid": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Ana admin silinemez
    if user.get('email', '').lower() == ADMIN_EMAIL.lower():
        raise HTTPException(status_code=400, detail="Ana admin silinemez")
    
    # Kullanıcıyı tüm topluluklardan çıkar
    await db.communities.update_many({}, {"$pull": {"members": user_id, "superAdmins": user_id}})
    await db.subgroups.update_many({}, {"$pull": {"members": user_id, "groupAdmins": user_id}})
    
    # Kullanıcıyı sil
    await db.users.delete_one({"uid": user_id})
    
    return {"message": "Kullanıcı silindi"}

# Kullanıcıyı tüm topluluklara süper admin yap
@api_router.post("/admin/users/{user_id}/make-super-admin-all")
async def make_super_admin_all(user_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    user = await db.users.find_one({"uid": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Tüm topluluklara süper admin olarak ekle
    result = await db.communities.update_many(
        {},
        {"$addToSet": {"superAdmins": user_id, "members": user_id}}
    )
    
    # Kullanıcıyı admin yap
    await db.users.update_one(
        {"uid": user_id},
        {"$set": {"isAdmin": True}}
    )
    
    return {"message": f"Kullanıcı {result.modified_count} topluluğa süper admin olarak eklendi"}

# Tüm toplulukları getir (admin)
@api_router.get("/admin/communities")
async def admin_get_communities(current_user: dict = Depends(get_current_user)):
    if not await check_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    communities = await db.communities.find().sort("name", 1).to_list(100)
    
    for c in communities:
        if '_id' in c:
            del c['_id']
        c['memberCount'] = len(c.get('members', []))
        c['superAdminCount'] = len(c.get('superAdmins', []))
        c['subGroupCount'] = len(c.get('subGroups', []))
    
    return clean_doc(communities)

# Topluluk detayı (admin)
@api_router.get("/admin/communities/{community_id}")
async def admin_get_community(community_id: str, current_user: dict = Depends(get_current_user)):
    if not await check_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    community = await db.communities.find_one({"id": community_id})
    if not community:
        raise HTTPException(status_code=404, detail="Topluluk bulunamadı")
    
    if '_id' in community:
        del community['_id']
    
    # Üyeleri getir
    members = await db.users.find({"uid": {"$in": community.get('members', [])}}).to_list(1000)
    for m in members:
        if '_id' in m:
            del m['_id']
        m['isSuperAdmin'] = m['uid'] in community.get('superAdmins', [])
    
    # Alt grupları getir
    subgroups = await db.subgroups.find({"communityId": community_id}).to_list(100)
    for sg in subgroups:
        if '_id' in sg:
            del sg['_id']
        sg['memberCount'] = len(sg.get('members', []))
    
    community['membersList'] = members
    community['subGroupsList'] = subgroups
    
    return community

# Topluluğa süper admin ekle/kaldır
@api_router.post("/admin/communities/{community_id}/super-admin")
async def admin_toggle_super_admin(community_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    if not await check_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    user_id = data.get('userId')
    action = data.get('action', 'add')  # 'add' or 'remove'
    
    if action == 'add':
        await db.communities.update_one(
            {"id": community_id},
            {"$addToSet": {"superAdmins": user_id, "members": user_id}}
        )
        return {"message": "Süper admin eklendi"}
    else:
        await db.communities.update_one(
            {"id": community_id},
            {"$pull": {"superAdmins": user_id}}
        )
        return {"message": "Süper admin kaldırıldı"}

# Sistem ayarları
@api_router.get("/admin/settings")
async def admin_get_settings(current_user: dict = Depends(get_current_user)):
    if not await check_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    settings = await db.settings.find_one({"type": "system"})
    if not settings:
        settings = {
            "type": "system",
            "appName": "Network Solution",
            "adminEmail": ADMIN_EMAIL,
            "maxFileSize": 50,  # MB
            "allowRegistration": True
        }
        await db.settings.insert_one(settings)
    
    if '_id' in settings:
        del settings['_id']
    
    return settings

# Mevcut admin'i tüm topluluklara ekle (startup için)
async def ensure_admin_in_all_communities():
    """Ana admin'i tüm topluluklara süper admin olarak ekle"""
    admin_user = await db.users.find_one({"email": ADMIN_EMAIL})
    if admin_user:
        await db.communities.update_many(
            {},
            {"$addToSet": {"superAdmins": admin_user['uid'], "members": admin_user['uid']}}
        )
        await db.users.update_one(
            {"uid": admin_user['uid']},
            {"$set": {"isAdmin": True}}
        )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Uygulama başlatıldığında 81 şehir topluluğunu oluştur"""
    try:
        await initialize_city_communities()
        await ensure_admin_in_all_communities()
        logger.info("✅ Şehir toplulukları başarıyla kontrol edildi/oluşturuldu")
    except Exception as e:
        logger.error(f"❌ Topluluk oluşturma hatası: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Wrap FastAPI app with Socket.IO
app = socketio.ASGIApp(sio, app)
