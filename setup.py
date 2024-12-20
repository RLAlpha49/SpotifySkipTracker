"""
Setup configuration for the SpotifySkipTracker application.
"""

from setuptools import setup, find_packages

setup(
    name="SpotifySkipTracker",
    version="1.0.0",
    description="A Spotify skip tracker application",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    install_requires=[
        "requests",
        "customtkinter",
        "flask",
        "cryptography",
        "python-dotenv",
    ],
    entry_points={
        "console_scripts": [
            "spotify-skip-tracker=app:SpotifySkipTrackerGUI",
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.10",
)
