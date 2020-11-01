import os
import random
import string

from decouple import config


DIR = os.path.realpath(os.path.dirname(__file__))
with open(os.path.join(DIR, 'words/adjectives/2syllableadjectives.txt')) as infile:
    lines = infile.read().splitlines()
    ADJECTIVES = list(lines)
with open(os.path.join(DIR, 'words/nouns/1syllablenouns.txt')) as infile:
    lines = infile.read().splitlines()
    NOUNS = list(lines)
WORDS = {
    'adj': ADJECTIVES,
    'noun': NOUNS
}


def env(var_name):
    try:
        var = os.environ[var_name]
    except KeyError:
        var = config(var_name)
    return var


def random_string(string_length=20):
    '''Generate a random string of letters, digits and special characters'''
    return ''.join([random.choice(string.ascii_lowercase + string.digits) for n in range(string_length)])


def random_phrase(*args, separator='_'):
    words = [WORDS[arg][random.randint(0, len(WORDS[arg]) - 1)] for arg in args]
    return separator.join(words)
