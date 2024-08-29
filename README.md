PHPView 0.2.0
=============

Chrome extension for pretty printing php print_r outputs.

For example, by doing this in your PHP file:
```php
    $array = array('element' => 'value');
    echo '<pre>';
    print_r($array); die;
```

Instead of displaying this:
```
    <pre>Array
    (
        [element] => value 
    )
```

We will see this in Chrome: 
```js
    [{"element": "value"}]
```


And it also allows you to collapse branches.

Check it out int he Chrome Store: https://chrome.google.com/webstore/detail/phpview/nlkobfbkblfhlcobdomlhmpbbhmcbkfd
