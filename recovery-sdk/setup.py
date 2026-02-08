"""
BlockDrive Recovery SDK - Setup Configuration
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="blockdrive-recovery",
    version="1.0.0",
    author="BlockDrive",
    author_email="support@blockdrive.io",
    description="Open-source recovery tool for BlockDrive encrypted files",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/blockdrive/recovery-sdk",
    project_urls={
        "Bug Tracker": "https://github.com/blockdrive/recovery-sdk/issues",
        "Documentation": "https://docs.blockdrive.io/recovery-sdk",
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Security :: Cryptography",
        "Topic :: System :: Archiving",
    ],
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "cryptography>=41.0.0",
        "requests>=2.28.0",
    ],
    extras_require={
        "solana": [
            "solana>=0.30.0",
            "solders>=0.20.0",
        ],
        "filebase": [
            "boto3>=1.28.0",  # For Filebase S3 API access
        ],
        "full": [
            "solana>=0.30.0",
            "solders>=0.20.0",
            "boto3>=1.28.0",
        ],
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "black>=23.0.0",
            "mypy>=1.0.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "blockdrive-recover=blockdrive_recovery.cli:main",
        ],
    },
    keywords=[
        "blockdrive",
        "encryption",
        "recovery",
        "ipfs",
        "filebase",
        "solana",
        "web3",
        "decentralized-storage",
    ],
)
