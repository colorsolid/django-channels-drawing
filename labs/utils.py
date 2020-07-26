from random import randrange


def get_random_colors(context={}):
    colors = [
        'black', 'white', 'grey', 'red', 'green', 'blue', 'pink',
        'gold', 'indigo', 'cyan'
    ]
    ind1 = randrange(len(colors))
    first = colors.pop(ind1)
    ind2 = randrange(len(colors))
    second = colors[ind2]
    context['colors'] = [first, second]
    return context
