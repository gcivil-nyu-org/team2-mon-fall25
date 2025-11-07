from storages.backends.s3boto3 import S3Boto3Storage

class S3MediaStorage(S3Boto3Storage):
    location = "media"            # S3 key prefix: "media/..."
    default_acl = "private"
    file_overwrite = False
    querystring_auth = True